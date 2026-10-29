import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Runs a prompt chain from the database (prompt_chains / prompt_chain_steps),
 * picking the chain by the weights in prompt_chain_mix when no slug is given.
 * Every model call is timed and returned as a log entry, so the caller can
 * save it to llm_responses once the generation request exists.
 * If the chain tables are missing or empty, it falls back to `fallbackPrompt`.
 */

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";

export type LlmLog = {
  stepId: number | null;
  providerModelId: string | null;
  systemPrompt: string | null;
  userPrompt: string;
  response: string | null;
  temperature: number | null;
  seconds: number;
  ok: boolean;
};

export type ChainResult = { chainId: number | null; output: string | null; model: string | null; prompt: string; logs: LlmLog[] };

type StepRow = {
  id: number;
  step_order: number;
  output_type: string;
  system_prompt: string;
  user_prompt: string;
  temperature: number | null;
  llm_models: { provider_model_id: string; is_temperature_supported: boolean; llm_providers: { name: string } | null } | null;
};

type Gemini = (opts: {
  system: string | null;
  user: string;
  json: boolean;
  temperature: number | null;
  preferredModel: string | null;
}) => Promise<{ text: string; model: string } | null>;

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? vars[key] : match)).replace(/\s+/g, " ").trim();
}

async function pickChainId(supabase: SupabaseClient, slug?: string): Promise<number | null> {
  if (slug) {
    const { data } = await supabase.from("prompt_chains").select("id").eq("slug", slug).maybeSingle();
    return data?.id ?? null;
  }
  const { data } = await supabase.from("prompt_chain_mix").select("prompt_chain_id, weight").gt("weight", 0);
  const mix = data ?? [];
  const total = mix.reduce((sum, m) => sum + m.weight, 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const m of mix) {
    roll -= m.weight;
    if (roll < 0) return m.prompt_chain_id;
  }
  return mix[mix.length - 1].prompt_chain_id;
}

/** Terms and few-shot examples that get injected into {terms} / {examples}. */
async function promptContext(supabase: SupabaseClient) {
  const [{ data: terms }, { data: examples }] = await Promise.all([
    supabase.from("terms").select("term, definition").order("priority", { ascending: false }).limit(6),
    supabase.from("generation_examples").select("mood, example_output").order("priority", { ascending: false }).limit(2),
  ]);
  return {
    terms: terms?.length ? `NYC terms you may see: ${terms.map((t) => `${t.term} = ${t.definition}`).join(" | ")}.` : "",
    examples: examples?.length
      ? `Examples of great answers: ${examples.map((e) => `mood "${e.mood}" -> ${e.example_output}`).join(" ; ")}.`
      : "",
  };
}

export async function runChain(
  supabase: SupabaseClient,
  gemini: Gemini,
  opts: { slug?: string; vars: Record<string, string>; fallbackPrompt: string },
): Promise<ChainResult> {
  const logs: LlmLog[] = [];

  let chainId: number | null = null;
  let steps: StepRow[] = [];
  try {
    chainId = await pickChainId(supabase, opts.slug);
    if (chainId) {
      const { data } = await supabase
        .from("prompt_chain_steps")
        .select(
          "id, step_order, output_type, system_prompt, user_prompt, temperature, llm_models(provider_model_id, is_temperature_supported, llm_providers(name))",
        )
        .eq("prompt_chain_id", chainId)
        .order("step_order", { ascending: true });
      steps = (data ?? []) as unknown as StepRow[];
    }
  } catch {
    steps = [];
  }

  // No chain configured: one call with the built-in prompt.
  if (steps.length === 0) {
    const started = Date.now();
    const answer = await gemini({ system: null, user: opts.fallbackPrompt, json: true, temperature: null, preferredModel: null });
    logs.push({
      stepId: null,
      providerModelId: answer?.model ?? null,
      systemPrompt: null,
      userPrompt: opts.fallbackPrompt,
      response: answer?.text ?? null,
      temperature: null,
      seconds: (Date.now() - started) / 1000,
      ok: Boolean(answer),
    });
    return { chainId: null, output: answer?.text ?? null, model: answer?.model ?? null, prompt: opts.fallbackPrompt, logs };
  }

  const context = await promptContext(supabase).catch(() => ({ terms: "", examples: "" }));
  const vars = { ...context, ...opts.vars, previous: "" };
  let output: string | null = null;
  let model: string | null = null;
  let lastPrompt = "";

  for (const step of steps) {
    const userPrompt = fill(step.user_prompt, vars);
    const isGoogle = step.llm_models?.llm_providers?.name === "Google";
    const temperature = step.llm_models?.is_temperature_supported === false ? null : step.temperature;
    const started = Date.now();
    const answer = await gemini({
      system: step.system_prompt,
      user: userPrompt,
      json: step.output_type === "json",
      temperature,
      // Only Google models can be called with our key; other providers fall back to Gemini.
      preferredModel: isGoogle ? step.llm_models!.provider_model_id : null,
    });
    logs.push({
      stepId: step.id,
      providerModelId: answer?.model ?? step.llm_models?.provider_model_id ?? null,
      systemPrompt: step.system_prompt,
      userPrompt,
      response: answer?.text ?? null,
      temperature,
      seconds: (Date.now() - started) / 1000,
      ok: Boolean(answer),
    });
    if (!answer) return { chainId, output: null, model: null, prompt: userPrompt, logs };

    vars.previous = answer.text;
    output = answer.text;
    model = answer.model;
    lastPrompt = userPrompt;
  }

  return { chainId, output, model, prompt: lastPrompt, logs };
}

/** Saves one chain run plus its LLM responses. Never throws: logging must not break the app. */
export async function saveChainLogs(
  supabase: SupabaseClient,
  userId: string,
  requestId: number | null,
  result: ChainResult,
) {
  try {
    let runId: number | null = null;
    if (requestId) {
      const { data } = await supabase
        .from("llm_prompt_chains")
        .insert({ prompt_chain_id: result.chainId, spot_request_id: requestId, profile_id: userId })
        .select("id")
        .single();
      runId = data?.id ?? null;
    }

    const modelIds = [...new Set(result.logs.map((l) => l.providerModelId).filter(Boolean))] as string[];
    const { data: models } = modelIds.length
      ? await supabase.from("llm_models").select("id, provider_model_id").in("provider_model_id", modelIds)
      : { data: [] as { id: number; provider_model_id: string }[] };
    const idFor = (m: string | null) => models?.find((x) => x.provider_model_id === m)?.id ?? null;

    await supabase.from("llm_responses").insert(
      result.logs.map((log) => ({
        profile_id: userId,
        spot_request_id: requestId,
        prompt_chain_id: result.chainId,
        llm_prompt_chain_id: runId,
        prompt_chain_step_id: log.stepId,
        llm_model_id: idFor(log.providerModelId),
        provider_model_id: log.providerModelId,
        system_prompt: log.systemPrompt,
        user_prompt: log.userPrompt,
        response: log.response,
        temperature: log.temperature,
        processing_time_seconds: Math.round(log.seconds * 100) / 100,
        succeeded: log.ok,
      })),
    );
  } catch (error) {
    console.error("Saving LLM logs failed:", error);
  }
}

export { GEMINI_API };
