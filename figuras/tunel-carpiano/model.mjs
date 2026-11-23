// Modelo puro: presión en el túnel carpiano y estado del nervio mediano.
// Gelberman et al., JBJS 1981: controles 2,5 mmHg neutra, 31 flexión, 30 extensión;
// síndrome del túnel carpiano 32 neutra, 94 flexión, 110 extensión.
// Lundborg et al. 1982 / Rydevik 1981: ~20–30 mmHg compromete el flujo venoso y el transporte axonal;
// ~50 mmHg bloquea la conducción.
// Liberación: tras cortar el ligamento la presión cae a valores cercanos a lo normal (ilustrativo).
export const MODEL_SRC = `
function pressureOf(f, s, rel) {
  const neutral = 2.5 + (32 - 2.5) * s;
  const end = f >= 0 ? 31 + (94 - 31) * s : 30 + (110 - 30) * s;
  const tight = neutral + (end - neutral) * Math.pow(Math.abs(f), 1.6);
  const open = 2.5 + (tight - 2.5) * 0.12;
  return tight + (open - tight) * rel;
}
function compressionOf(p) { return Math.min(1, Math.max(0, (p - 8) / 80)); }
function signalOf(p) {
  if (p < 30) return { level: 1, tingle: 0, label: "nervio normal" };
  if (p < 50) return { level: 0.75 - 0.25 * (p - 30) / 20, tingle: 1, label: "hormigueo" };
  return { level: Math.max(0.08, 0.5 - 0.42 * Math.min(1, (p - 50) / 40)), tingle: p < 70 ? 1 : 0, label: "adormecimiento" };
}
function postureOf(f) {
  const deg = Math.round(Math.abs(f) * 60);
  if (deg < 6) return "neutra";
  return (f > 0 ? "flexión " : "extensión ") + deg + "°";
}
`;
