# Shopify theme sections (goals.ac)

When a Shopify connection uses **Article + section metafields** or **OS 2.0 page sections**, the goals.ac plugin stores structured JSON on the article or page. Your theme must read and render it.

**No theme app block yet.** Partners paste Liquid into the merchant theme (Online Store → Themes → Edit code). Copy-ready files live in [`cms-plugins/shopify/theme-snippets/`](../../cms-plugins/shopify/theme-snippets/).

## Install steps (demos / partners)

### Article + section metafields (`article_metafields`)

1. Connect the goals.ac Shopify app plugin (Admin API alone cannot use metafield modes).
2. In Publishing / Integrations, set output format to **Article + section metafields**.
3. Open the active theme → **Edit code**.
4. Copy [`theme-snippets/goals-ac-article-sections.liquid`](../../cms-plugins/shopify/theme-snippets/goals-ac-article-sections.liquid) into the article template (or `{% render %}` / include it from that template).
5. Publish a test article and open the blog post URL — sections should render; without the snippet only the HTML `body` fallback appears.

### OS 2.0 page sections (`page_sections`)

1. Set output format to **OS 2.0 page sections**.
2. Copy [`theme-snippets/sections/goals-ac-page-sections.liquid`](../../cms-plugins/shopify/theme-snippets/sections/goals-ac-page-sections.liquid) → theme `sections/goals-ac-page-sections.liquid`.
3. Copy [`theme-snippets/templates/page.goals-ac.json`](../../cms-plugins/shopify/theme-snippets/templates/page.goals-ac.json) → theme `templates/page.goals-ac.json`.
4. Publish a test page — the plugin sets template suffix `goals-ac`, which maps to that JSON template.

## Article metafields mode

The plugin writes a JSON metafield:

- Namespace: `goals_ac`
- Key: `content_sections`
- Type: `json`

Example payload:

```json
[
  {
    "type": "rich-text",
    "settings": {
      "heading": "Introduction",
      "text": "<p>First section HTML</p>"
    }
  },
  {
    "type": "image-with-text",
    "settings": {
      "heading": "Key insight",
      "text": "<p>Body copy</p>",
      "image": "https://cdn.example.com/photo.jpg"
    }
  }
]
```

### Minimal Liquid snippet

Same markup as `theme-snippets/goals-ac-article-sections.liquid`:

```liquid
{% assign sections = article.metafields.goals_ac.content_sections.value %}
{% if sections %}
  {% for block in sections %}
    {% case block.type %}
      {% when 'rich-text' %}
        <div class="goals-ac-rich-text">
          {% if block.settings.heading != blank %}
            <h2>{{ block.settings.heading }}</h2>
          {% endif %}
          {{ block.settings.text }}
        </div>
      {% when 'image-with-text' %}
        <div class="goals-ac-image-text">
          {% if block.settings.image != blank %}
            <img src="{{ block.settings.image }}" alt="{{ block.settings.heading | escape }}" loading="lazy">
          {% endif %}
          {% if block.settings.heading != blank %}
            <h2>{{ block.settings.heading }}</h2>
          {% endif %}
          {{ block.settings.text }}
        </div>
    {% endcase %}
  {% endfor %}
{% else %}
  {{ article.content }}
{% endif %}
```

The article `body` field still receives HTML as a fallback for themes without this snippet.

## Page sections mode

Creates an **Online Store page** with template suffix `goals-ac` and stores section JSON in page metafields (`goals_ac.content_sections`). Requires theme files above (`page.goals-ac.json` + section Liquid). Page `body` HTML is also written as a fallback.

## Health check

`GET /goals-ac/v1/health` returns:

```json
{
  "capabilities": {
    "output_modes": ["article_html", "article_metafields", "page_sections"],
    "theme_snippet_required_for": ["article_metafields", "page_sections"]
  }
}
```

Connect the goals.ac Shopify app plugin for metafield and page modes; direct Admin API connections support `article_html` only.
