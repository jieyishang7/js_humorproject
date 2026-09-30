export default function Home() {
  return (
    <main>
      <header><span className="brand">js_humorproject</span><span className="week">WEEK 01</span></header>
      <section aria-labelledby="greeting">
        <p className="eyebrow">THE HUMOR PROJECT</p>
        <h1 id="greeting">Hello,<br /><span>World.</span></h1>
        <p className="intro">Every great project starts with a hello.<br />This one starts with a little humor, too.</p>
        <div className="joke"><span aria-hidden="true">:)</span><p>Why did the developer say hello?<br /><strong>To make a good first expression.</strong></p></div>
      </section>
      <footer><span>Built with Next.js</span><span>Small start. Big possibilities.</span></footer>
    </main>
  );
}
