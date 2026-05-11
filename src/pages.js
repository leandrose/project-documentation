function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderMarkdownPage({ title, sidebar, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/assets/documentation.css">
</head>
<body>
  <div class="documentation-layout">
    <aside class="documentation-sidebar">
      ${sidebar}
    </aside>
    <main class="markdown-page">
      ${body}
    </main>
  </div>
</body>
</html>`;
}

export function renderRedocPage({ title, specUrl }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>body { margin: 0; padding: 0; }</style>
</head>
<body>
  <redoc spec-url="${escapeHtml(specUrl)}"></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>`;
}

export function renderSwaggerPage({ specUrl }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Swagger UI</title>
  <link rel="stylesheet" href="/swagger-ui-assets/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/swagger-ui-assets/swagger-ui-bundle.js"></script>
  <script src="/swagger-ui-assets/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: ${JSON.stringify(specUrl)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        oauth2RedirectUrl: window.location.origin + '/oauth2-redirect.html'
      });
    };
  </script>
</body>
</html>`;
}
