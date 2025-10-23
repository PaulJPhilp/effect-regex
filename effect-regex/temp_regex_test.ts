try {
  /[invalid(regex/;;;;;;;;;;;
  console.log("Regex is valid");
} catch (e) {
  console.log("Regex is invalid:", (e as Error).message);
}
