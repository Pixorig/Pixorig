/** @jsx h */
import { h } from "preact";

export interface SliderControlGroupProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  sliderMin?: number;
  sliderMax?: number;
  step?: number;
  btnStep?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function SliderControlGroup(props: SliderControlGroupProps) {
  const {
    label,
    value = 0,
    min = 0,
    max = 100,
    sliderMin = min,
    sliderMax = max,
    step = 1,
    btnStep = step,
    unit = "",
    onChange,
  } = props;

  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v)));

  return (
    <div
      class="slider-control-group"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          gap: "6px",
          fontSize: "12px",
          color: "#fff",
          fontWeight: "500",
        }}
      >
        <span>{label}:</span>
        <span class="slider-val-display" style={{ color: "#00f260", fontWeight: "bold" }}>
          {value}
          {unit}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          type="button"
          class="slider-btn-minus"
          style={{
            width: "28px",
            height: "28px",
            background: "#2a2a2a",
            border: "1px solid #444",
            borderRadius: "4px",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            fontWeight: "bold",
            userSelect: "none",
          }}
          onClick={() => onChange(clamp(value - btnStep))}
        >
          -
        </button>

        <input
          type="range"
          class="slider-range-input"
          min={sliderMin}
          max={sliderMax}
          step={step}
          value={Math.min(Math.max(value, sliderMin), sliderMax)}
          style={{ flex: "1", cursor: "pointer", accentColor: "#00f260" }}
          onInput={(e) => {
            const nextVal = clamp(Number((e.target as HTMLInputElement).value));
            onChange(nextVal);
          }}
        />

        <button
          type="button"
          class="slider-btn-plus"
          style={{
            width: "28px",
            height: "28px",
            background: "#2a2a2a",
            border: "1px solid #444",
            borderRadius: "4px",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            fontWeight: "bold",
            userSelect: "none",
          }}
          onClick={() => onChange(clamp(value + btnStep))}
        >
          +
        </button>
      </div>
    </div>
  );
}
