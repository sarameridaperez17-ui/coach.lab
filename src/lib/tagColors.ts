// Color de fondo por etiqueta de tarea — determinista a partir del id de la
// etiqueta, así la misma etiqueta se ve siempre del mismo color en
// cualquier parte de la web (tarjetas, filtros...), sin guardar nada nuevo
// en la base de datos. Vive en lib/ (no duplicado por página) precisamente
// para que ese color sea el mismo en todos los sitios donde se use.

const TAG_COLOR_PALETTE: { bg: string; text: string }[] = [
  { bg: "bg-red-600", text: "text-white" },
  { bg: "bg-orange-600", text: "text-white" },
  { bg: "bg-amber-600", text: "text-white" },
  { bg: "bg-lime-600", text: "text-white" },
  { bg: "bg-green-600", text: "text-white" },
  { bg: "bg-emerald-600", text: "text-white" },
  { bg: "bg-teal-600", text: "text-white" },
  { bg: "bg-cyan-600", text: "text-white" },
  { bg: "bg-sky-600", text: "text-white" },
  { bg: "bg-blue-600", text: "text-white" },
  { bg: "bg-indigo-600", text: "text-white" },
  { bg: "bg-violet-600", text: "text-white" },
  { bg: "bg-purple-600", text: "text-white" },
  { bg: "bg-fuchsia-600", text: "text-white" },
  { bg: "bg-pink-600", text: "text-white" },
  { bg: "bg-rose-600", text: "text-white" },
];

export function getTagColor(tagId: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < tagId.length; i++) {
    hash = (hash * 31 + tagId.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % TAG_COLOR_PALETTE.length;
  return TAG_COLOR_PALETTE[index];
}
