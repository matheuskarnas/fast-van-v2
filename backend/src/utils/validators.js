/**
 * Validadores de Campos
 * Funções reutilizáveis para validação de CPF, Email, Senha, CNH
 */

/**
 * Valida CPF brasileiro (com ou sem máscara)
 * @param {string} cpf - CPF a validar
 * @returns {boolean}
 */
function validateCPF(cpf) {
  if (!cpf || typeof cpf !== "string") return false;

  // Remove máscara
  const cleanCPF = cpf.replace(/[^\d]/g, "");

  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;

  // Rejeita CPFs sequenciais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  // Calcula primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;

  // Calcula segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;

  // Verifica se os dígitos verificadores estão corretos
  return parseInt(cleanCPF[9]) === digit1 && parseInt(cleanCPF[10]) === digit2;
}

/**
 * Valida formato de email
 * @param {string} email - Email a validar
 * @returns {boolean}
 */
function validateEmail(email) {
  if (!email || typeof email !== "string") return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida força de senha
 * Requisitos:
 * - Mínimo 6 caracteres
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 letra minúscula
 * - Pelo menos 1 número
 * - Pelo menos 1 caractere especial
 * @param {string} password - Senha a validar
 * @returns {boolean}
 */
function validatePassword(password) {
  if (!password || typeof password !== "string") return false;

  // Regex: pelo menos 1 maiúscula, 1 minúscula, 1 número, 1 especial, mínimo 6 caracteres
  const passwordRegex =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;

  return passwordRegex.test(password);
}

/**
 * Valida CNH brasileira
 * @param {string} cnh - CNH a validar
 * @param {object} options - { validateInProduction: false por padrão }
 * @returns {boolean}
 */
function validateCNH(cnh, options = {}) {
  if (!cnh || typeof cnh !== "string") return false;

  const { validateInProduction = false } = options;

  // Verificação básica de comprimento
  if (cnh.length < 1 || cnh.length > 12) return false;

  // TODO: Implementar validação real de CNH brasileira
  // Ligar validação de CNH em produção mudando validateInProduction para true
  if (validateInProduction) {
    // Implementar algoritmo de validação de CNH aqui
    // Por enquanto, retorna true para testes
    return true;
  }

  // Em testes, apenas verifica se não está vazia
  return cnh.length > 0;
}

/**
 * Verifica se um campo está vazio
 * @param {any} value - Valor a verificar
 * @returns {boolean}
 */
function isEmpty(value) {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")
  );
}

/**
 * Valida idade mínima
 * @param {number} age - Idade a validar
 * @param {number} minAge - Idade mínima (padrão 18)
 * @returns {boolean}
 */
function validateAge(age, minAge = 18) {
  return typeof age === "number" && age >= minAge && age <= 150;
}

/**
 * Valida ano de nascimento
 * @param {number} birthYear - Ano de nascimento
 * @returns {boolean}
 */
function validateBirthYear(birthYear) {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  return age >= 18 && age <= 150 && birthYear > 1900;
}

module.exports = {
  validateCPF,
  validateEmail,
  validatePassword,
  validateCNH,
  isEmpty,
  validateAge,
  validateBirthYear,
};
