export async function ESMExtension() {
  const { execa } = await import("execa");
  return { execa };
}
