type BrandTailoringPanelProps = {
  voiceTone?: string;
  brandColors?: string[];
  productOfferings?: string[];
  doWords?: string[];
};

export function BrandTailoringPanel({
  voiceTone,
  brandColors = [],
  productOfferings = [],
  doWords = [],
}: BrandTailoringPanelProps) {
  const toneTags = voiceTone
    ? voiceTone.split(/[,;]+/).map((t) => t.trim()).filter(Boolean)
    : doWords.slice(0, 4);

  if (!toneTags.length && !brandColors.length && !productOfferings.length) {
    return null;
  }

  return (
    <div className="paper-card rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-sm">Brand tailoring</h3>

      {brandColors.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Brand colors</p>
          <div className="flex flex-wrap gap-2">
            {brandColors.map((color) => (
              <div key={color} className="flex items-center gap-1.5 text-xs">
                <span
                  className="h-5 w-5 rounded border border-border shrink-0"
                  style={{ backgroundColor: color.startsWith("#") ? color : `#${color}` }}
                />
                <span className="font-mono">{color}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {toneTags.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Voice & tone</p>
          <div className="flex flex-wrap gap-1.5">
            {toneTags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {productOfferings.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Cross-linked offerings</p>
          <ul className="text-xs space-y-1">
            {productOfferings.map((item) => (
              <li key={item} className="text-foreground">{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
