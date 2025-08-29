function generateRandomDigits(length) {
  // Genera un número aleatorio y lo rellena con ceros a la izquierda si hace falta
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}
exports.generateRandomDigits = generateRandomDigits;
