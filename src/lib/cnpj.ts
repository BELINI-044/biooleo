// A Receita Federal usa o valor ASCII menos 48 para o CNPJ alfanumérico.
function digito(base: string) {
  let soma = 0;
  for (let i = base.length - 1, peso = 2; i >= 0; i--, peso = peso === 9 ? 2 : peso + 1) {
    soma += (base.charCodeAt(i) - 48) * peso;
  }
  const resto = soma % 11;
  return resto < 2 ? "0" : String(11 - resto);
}
export function completarCnpj(base: string) {
  const primeiro = digito(base);
  return base + primeiro + digito(base + primeiro);
}
export function cnpjValido(cnpj: string) {
  return /^[A-Z0-9]{12}[0-9]{2}$/.test(cnpj) && !/^(\d)\1{13}$/.test(cnpj) && completarCnpj(cnpj.slice(0, 12)) === cnpj;
}
export function limparCnpj(cnpj: string) {
  return cnpj.toUpperCase().replace(/[.\/\s-]/g, "");
}
export function formatarCnpj(cnpj: string) {
  return cnpj.replace(/^([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}
