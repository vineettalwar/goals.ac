# Shopify theme sections (goals.ac)

When a Shopify connection uses **Article + section metafields** or **OS 2.0 page sections**, the goals.ac plugin stores structured JSON on the article or page. Your theme must read and render it.

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

Add to your article template or a section that loops metafields:

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

Creates an **Online Store page** with template suffix `goals-ac` and stores section JSON in page metafields. Requires a theme template `templates/page.goals-ac.json` that reads the same metafield structure.

## Health check

`GET /goals-ac/v1/health` returns:

```json
{
  "capabilities": {
    "output_modes": ["article_html", "article_metafields", "page_sections"]
  }
}
```

Connect the goals.ac Shopify app plugin for metafield and page modes; direct Admin API connections support `article_html` only.
