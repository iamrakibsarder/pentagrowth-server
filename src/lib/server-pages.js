export function backendHomePage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pentagrowth Server</title>
    <style>
      :root {
        color-scheme: dark;
        --blood: #d71920;
        --ember: #ff6b2c;
        --ink: #030305;
        --bone: #f3eee7;
      }

      * {
        box-sizing: border-box;
      }

      body {
        min-height: 100vh;
        margin: 0;
        overflow: hidden;
        background:
          radial-gradient(circle at 50% 18%, rgb(215 25 32 / 0.28), transparent 22rem),
          radial-gradient(circle at 18% 80%, rgb(255 107 44 / 0.12), transparent 20rem),
          linear-gradient(180deg, #09060a 0%, var(--ink) 64%, #000 100%);
        color: var(--bone);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body::before {
        position: fixed;
        inset: 0;
        content: "";
        opacity: 0.3;
        background-image:
          linear-gradient(rgb(255 255 255 / 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px);
        background-size: 46px 46px;
        mask-image: radial-gradient(circle at center, black, transparent 72%);
      }

      main {
        position: relative;
        z-index: 1;
        display: grid;
        min-height: 100vh;
        place-items: center;
        padding: 2rem;
        text-align: center;
      }

      .sigil {
        display: inline-grid;
        width: 6rem;
        height: 6rem;
        place-items: center;
        border: 1px solid rgb(255 255 255 / 0.2);
        border-radius: 999px;
        background: rgb(0 0 0 / 0.36);
        box-shadow: 0 0 80px rgb(215 25 32 / 0.42), inset 0 0 40px rgb(215 25 32 / 0.18);
        color: var(--blood);
        font-size: 3rem;
        line-height: 1;
      }

      h1 {
        margin: 1.6rem auto 0;
        max-width: 56rem;
        font-size: clamp(3rem, 9vw, 8rem);
        line-height: 0.9;
        letter-spacing: 0;
        text-transform: uppercase;
        text-shadow: 0 0 34px rgb(215 25 32 / 0.46);
      }

      p {
        max-width: 42rem;
        margin: 1.25rem auto 0;
        color: rgb(243 238 231 / 0.7);
        font-size: clamp(1rem, 2vw, 1.25rem);
        font-weight: 650;
        line-height: 1.65;
      }

      .status {
        display: inline-flex;
        align-items: center;
        gap: 0.65rem;
        margin-top: 2rem;
        border: 1px solid rgb(255 255 255 / 0.16);
        border-radius: 999px;
        background: rgb(255 255 255 / 0.055);
        padding: 0.85rem 1.1rem;
        color: rgb(243 238 231 / 0.84);
        font-size: 0.85rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      .pulse {
        width: 0.62rem;
        height: 0.62rem;
        border-radius: 999px;
        background: var(--blood);
        box-shadow: 0 0 20px var(--blood);
      }
    </style>
  </head>
  <body>
    <main>
      <section>
        <div class="sigil">!</div>
        <h1>The backend is awake.</h1>
        <p>This is not the website. This is the machinery room. If you can see this page, the Pentagrowth API is breathing quietly behind the walls.</p>
        <div class="status"><span class="pulse"></span> API online</div>
      </section>
    </main>
  </body>
</html>`;
}

export function backendNotFoundPage(path) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>404 | Pentagrowth Server</title>
    <style>
      :root { color-scheme: dark; }
      body {
        display: grid;
        min-height: 100vh;
        margin: 0;
        place-items: center;
        background: radial-gradient(circle at 50% 20%, rgb(215 25 32 / 0.24), transparent 24rem), #020204;
        color: #f3eee7;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        text-align: center;
      }
      section { max-width: 42rem; padding: 2rem; }
      h1 { margin: 0; font-size: clamp(4rem, 14vw, 10rem); line-height: 0.85; }
      p { margin: 1.2rem auto 0; color: rgb(243 238 231 / 0.68); font-size: 1.1rem; line-height: 1.7; }
      code { border: 1px solid rgb(255 255 255 / 0.14); border-radius: 0.5rem; background: rgb(255 255 255 / 0.06); padding: 0.2rem 0.45rem; }
      a { display: inline-flex; margin-top: 1.6rem; border-radius: 999px; background: #f3eee7; padding: 0.9rem 1.2rem; color: #09060a; font-weight: 800; text-decoration: none; }
    </style>
  </head>
  <body>
    <section>
      <h1>404</h1>
      <p>The route <code>${path}</code> is not part of this backend. Try the health endpoint, or return to the main site.</p>
      <a href="/health">Check health</a>
    </section>
  </body>
</html>`;
}
