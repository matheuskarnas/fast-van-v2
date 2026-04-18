/**
 * Auth Service
 * Serviço responsável por validação e criação de usuários
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  validateCPF,
  validateEmail,
  validatePassword,
  validateCNH,
  isEmpty,
  validateAge,
  validateBirthYear,
} = require("../utils/validators");
const {
  getUserByEmail,
  getUserByCPF,
  getUserByCNH,
  createUserInDB,
} = require("./userService");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

/**
 * Cria um novo usuário (Passageiro ou Motorista)
 * @param {object} userData - Dados do usuário
 * @returns {object} { success, user, token, redirectTo, error }
 */
async function createUser(userData) {
  try {
    // Validação de campos obrigatórios
    const validationError = validateRequiredFields(userData);
    if (validationError) return validationError;

    // Validação de CPF
    if (!validateCPF(userData.cpf)) {
      return {
        success: false,
        error: {
          code: "INVALID_CPF",
          field: "cpf",
          message: "CPF inválido",
        },
      };
    }

    // Validação de email
    if (!validateEmail(userData.email)) {
      return {
        success: false,
        error: {
          code: "INVALID_EMAIL",
          field: "email",
          message: "Email em formato inválido",
        },
      };
    }

    // Validação de senha
    if (!validatePassword(userData.password)) {
      return {
        success: false,
        error: {
          code: "WEAK_PASSWORD",
          field: "password",
          message:
            "Senha deve ter no mínimo 6 caracteres, 1 número, 1 maiúscula, 1 minúscula e 1 caractere especial",
        },
      };
    }

    // Verificação de CPF duplicado
    const existingByCPF = await getUserByCPF(userData.cpf);
    if (existingByCPF) {
      return {
        success: false,
        error: {
          code: "CPF_ALREADY_EXISTS",
          field: "cpf",
          message: "CPF já cadastrado no sistema",
        },
      };
    }

    // Verificação de email duplicado
    const existingByEmail = await getUserByEmail(userData.email);
    if (existingByEmail) {
      return {
        success: false,
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          field: "email",
          message: "Email já cadastrado no sistema",
        },
      };
    }

    // Validações específicas por role
    if (userData.role === "DRIVER") {
      // Validação de CNH
      if (!validateCNH(userData.cnh, { validateInProduction: false })) {
        return {
          success: false,
          error: {
            code: "INVALID_CNH",
            field: "cnh",
            message: "CNH inválida",
          },
        };
      }

      // Verificação de CNH duplicado
      const existingByCNH = await getUserByCNH(userData.cnh);
      if (existingByCNH) {
        return {
          success: false,
          error: {
            code: "CNH_ALREADY_EXISTS",
            field: "cnh",
            message: "CNH já cadastrada no sistema",
          },
        };
      }

      // Validação de ano de nascimento
      if (!validateBirthYear(userData.birthYear)) {
        return {
          success: false,
          error: {
            code: "INVALID_BIRTH_YEAR",
            field: "birthYear",
            message: "Ano de nascimento inválido",
          },
        };
      }
    } else if (userData.role === "PASSENGER") {
      // Validação de idade
      if (!validateAge(userData.age)) {
        return {
          success: false,
          error: {
            code: "INVALID_AGE",
            field: "age",
            message: "Idade deve estar entre 18 e 150 anos",
          },
        };
      }
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Preparar dados para armazenar no banco
    const userToCreate = {
      name: userData.name,
      cpf: userData.cpf.replace(/[^\d]/g, ""), // Armazena sem máscara
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      ...(userData.role === "DRIVER" && {
        cnh: userData.cnh,
        birthYear: userData.birthYear,
      }),
      ...(userData.role === "PASSENGER" && {
        age: userData.age,
      }),
    };

    // Criar usuário no banco
    const newUser = await createUserInDB(userToCreate);

    // Gerar token JWT
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Determinar redirecionamento
    const redirectTo =
      userData.role === "DRIVER"
        ? "/driver/register-vehicle"
        : "/passenger/home";

    return {
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        ...(userData.role === "DRIVER" && { cnh: newUser.cnh }),
      },
      token,
      redirectTo,
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Erro ao criar usuário. Tente novamente.",
      },
    };
  }
}

/**
 * Valida campos obrigatórios de acordo com a role
 * @param {object} userData - Dados do usuário
 * @returns {object|null} Erro se houver campos vazios, null caso contrário
 */
function validateRequiredFields(userData) {
  const commonRequiredFields = ["name", "cpf", "email", "password", "role"];
  const driverRequiredFields = ["cnh", "birthYear"];
  const passengerRequiredFields = ["age"];

  const fieldsToCheck =
    userData.role === "DRIVER"
      ? [...commonRequiredFields, ...driverRequiredFields]
      : [...commonRequiredFields, ...passengerRequiredFields];

  for (const field of fieldsToCheck) {
    if (isEmpty(userData[field])) {
      return {
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELD",
          field,
          message: "Preencha todos os campos obrigatórios",
        },
      };
    }
  }

  return null;
}

/**
 * Autentica um usuário existente
 * @param {string} email - Email do usuário
 * @param {string} password - Senha do usuário
 * @returns {object} { success, user, token, error }
 */
async function authenticateUser(email, password) {
  try {
    if (!email || !password) {
      return {
        success: false,
        error: {
          code: "MISSING_CREDENTIALS",
          message: "Email e senha são obrigatórios",
        },
      };
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Email ou senha inválidos",
        },
      };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Email ou senha inválidos",
        },
      };
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    };
  } catch (error) {
    console.error("Error authenticating user:", error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Erro ao autenticar. Tente novamente.",
      },
    };
  }
}

/**
 * Verifica se um token é válido
 * @param {string} token - Token JWT
 * @returns {object|null} Dados decodificados do token ou null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
}

module.exports = {
  createUser,
  authenticateUser,
  verifyToken,
  validateCPF,
  validateEmail,
  validatePassword,
  validateCNH,
};
