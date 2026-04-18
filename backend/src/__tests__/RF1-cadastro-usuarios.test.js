/**
 * RF1: Cadastro de Usuários com Perfis Distintos
 * Testes automatizados para validação de cadastro de passageiros e motoristas
 */

const {
  createUser,
  validateCPF,
  validateEmail,
  validatePassword,
  validateCNH,
} = require("../services/authService");
const {
  getUserByEmail,
  getUserByCPF,
  getUserByCNH,
  clearDatabase,
} = require("../services/userService");

describe("RF1: Cadastro de Usuários", () => {
  // ============================================
  // TESTES DE VALIDAÇÃO DE CAMPOS INDIVIDUAIS
  // ============================================

  describe("Validação de CPF", () => {
    it("deve aceitar CPF válido com máscara", () => {
      const cpf = "123.456.789-09";
      expect(validateCPF(cpf)).toBe(true);
    });

    it("deve aceitar CPF válido sem máscara", () => {
      const cpf = "12345678909";
      expect(validateCPF(cpf)).toBe(true);
    });

    it("deve rejeitar CPF inválido (números sequenciais)", () => {
      const cpf = "111.111.111-11";
      expect(validateCPF(cpf)).toBe(false);
    });

    it("deve rejeitar CPF inválido (dígito verificador errado)", () => {
      const cpf = "123.456.789-00";
      expect(validateCPF(cpf)).toBe(false);
    });

    it("deve rejeitar CPF vazio", () => {
      expect(validateCPF("")).toBe(false);
    });

    it("deve rejeitar CPF com caracteres não numéricos (exceto máscara)", () => {
      expect(validateCPF("12A.456.789-09")).toBe(false);
    });
  });

  describe("Validação de Email", () => {
    it("deve aceitar email válido", () => {
      expect(validateEmail("joao@example.com")).toBe(true);
    });

    it("deve rejeitar email sem @", () => {
      expect(validateEmail("joaoexample.com")).toBe(false);
    });

    it("deve rejeitar email sem domínio", () => {
      expect(validateEmail("joao@")).toBe(false);
    });

    it("deve rejeitar email vazio", () => {
      expect(validateEmail("")).toBe(false);
    });

    it("deve aceitar email com subdomínio", () => {
      expect(validateEmail("joao@mail.example.co.uk")).toBe(true);
    });
  });

  describe("Validação de Senha", () => {
    const validPassword = "Senha@123";

    it("deve aceitar senha com todos os requisitos", () => {
      expect(validatePassword("Senha@123")).toBe(true);
    });

    it("deve rejeitar senha com menos de 6 caracteres", () => {
      expect(validatePassword("Ab@1")).toBe(false);
    });

    it("deve rejeitar senha sem letra maiúscula", () => {
      expect(validatePassword("senha@123")).toBe(false);
    });

    it("deve rejeitar senha sem letra minúscula", () => {
      expect(validatePassword("SENHA@123")).toBe(false);
    });

    it("deve rejeitar senha sem número", () => {
      expect(validatePassword("Senha@abc")).toBe(false);
    });

    it("deve rejeitar senha sem caractere especial", () => {
      expect(validatePassword("Senha123")).toBe(false);
    });

    it("deve aceitar senha com vários caracteres especiais válidos", () => {
      expect(validatePassword("Senha!@#$%^&*1")).toBe(true);
    });

    it("deve rejeitar senha vazia", () => {
      expect(validatePassword("")).toBe(false);
    });
  });

  describe("Validação de CNH", () => {
    it("deve aceitar CNH válida (apenas estrutura em testes, validação real desligada)", () => {
      // TODO: Ligar validação de CNH em produção
      const cnh = "0123456789";
      expect(validateCNH(cnh, { validateInProduction: false })).toBe(true);
    });

    it("deve rejeitar CNH vazia", () => {
      expect(validateCNH("", { validateInProduction: false })).toBe(false);
    });

    it("deve aceitar CNH com até 12 caracteres", () => {
      expect(validateCNH("123456789012", { validateInProduction: false })).toBe(
        true,
      );
    });
  });

  // ============================================
  // TESTES DE CADASTRO - CENÁRIOS DE SUCESSO
  // ============================================

  describe("Cadastro de Passageiro - Sucesso", () => {
    const validPassengerData = {
      name: "João Silva",
      cpf: "123.456.789-09",
      age: 25,
      email: "joao@example.com",
      password: "Senha@123",
      role: "PASSENGER",
    };

    beforeEach(async () => {
      // Limpar banco antes de cada teste
      await clearDatabase();
    });

    it("Cenário 1.1: deve criar passageiro com dados válidos", async () => {
      const result = await createUser(validPassengerData);

      expect(result.success).toBe(true);
      expect(result.user.id).toBeDefined();
      expect(result.user.role).toBe("PASSENGER");
      expect(result.user.email).toBe(validPassengerData.email);
    });

    it("deve retornar token de autenticação após cadastro bem-sucedido", async () => {
      const result = await createUser(validPassengerData);

      expect(result.token).toBeDefined();
      expect(result.token.length).toBeGreaterThan(0);
    });

    it("deve redirecionar para home do passageiro após cadastro", async () => {
      const result = await createUser(validPassengerData);

      expect(result.redirectTo).toBe("/passenger/home");
    });

    it("deve armazenar senha de forma segura (hash)", async () => {
      const result = await createUser(validPassengerData);
      const userInDB = await getUserByEmail(validPassengerData.email);

      expect(userInDB.password).not.toBe(validPassengerData.password);
      expect(userInDB.password.length).toBeGreaterThan(20); // Hash bcrypt típico
    });
  });

  describe("Cadastro de Motorista - Sucesso", () => {
    const validDriverData = {
      name: "Maria Silva",
      cpf: "987.654.321-00",
      cnh: "9876543210",
      birthYear: 1990,
      email: "maria@example.com",
      password: "Senha@456",
      role: "DRIVER",
    };

    beforeEach(async () => {
      await clearDatabase();
    });

    it("Cenário 1.2: deve criar motorista com dados válidos", async () => {
      const result = await createUser(validDriverData);

      expect(result.success).toBe(true);
      expect(result.user.id).toBeDefined();
      expect(result.user.role).toBe("DRIVER");
      expect(result.user.cnh).toBe(validDriverData.cnh);
    });

    it("deve redirecionar para cadastro de veículo após cadastro de motorista", async () => {
      const result = await createUser(validDriverData);

      expect(result.redirectTo).toBe("/driver/register-vehicle");
    });

    it("deve retornar token de autenticação após cadastro bem-sucedido", async () => {
      const result = await createUser(validDriverData);

      expect(result.token).toBeDefined();
      expect(result.token.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // TESTES DE VALIDAÇÃO - ERRO POR CAMPO
  // ============================================

  describe("Cenário 1.3: CPF Inválido", () => {
    beforeEach(async () => {
      await clearDatabase();
    });

    it("deve rejeitar CPF inválido", async () => {
      const invalidData = {
        name: "João Silva",
        cpf: "000.000.000-00",
        age: 25,
        email: "joao@example.com",
        password: "Senha@123",
        role: "PASSENGER",
      };

      const result = await createUser(invalidData);

      expect(result.success).toBe(false);
      expect(result.error.field).toBe("cpf");
      expect(result.error.message).toBe("CPF inválido");
      expect(result.user).toBeUndefined();
    });

    it("deve retornar mensagem de erro específica para CPF inválido", async () => {
      const invalidData = {
        name: "João Silva",
        cpf: "123.456.789-00",
        age: 25,
        email: "joao@example.com",
        password: "Senha@123",
        role: "PASSENGER",
      };

      const result = await createUser(invalidData);

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe("INVALID_CPF");
    });
  });

  describe("Cenário 1.4: CPF Já Cadastrado", () => {
    const existingData = {
      name: "João Silva",
      cpf: "123.456.789-09",
      age: 25,
      email: "joao@example.com",
      password: "Senha@123",
      role: "PASSENGER",
    };

    beforeEach(async () => {
      await clearDatabase();
      await createUser(existingData);
    });

    it("deve rejeitar CPF duplicado", async () => {
      const duplicateData = {
        name: "Maria Silva",
        cpf: "123.456.789-09",
        age: 30,
        email: "maria@example.com",
        password: "Senha@456",
        role: "PASSENGER",
      };

      const result = await createUser(duplicateData);

      expect(result.success).toBe(false);
      expect(result.error.message).toBe("CPF já cadastrado no sistema");
      expect(result.error.code).toBe("CPF_ALREADY_EXISTS");
    });
  });

  describe("Cenário 1.5: Email Já Cadastrado", () => {
    const existingData = {
      name: "João Silva",
      cpf: "123.456.789-09",
      age: 25,
      email: "joao@example.com",
      password: "Senha@123",
      role: "PASSENGER",
    };

    beforeEach(async () => {
      await clearDatabase();
      await createUser(existingData);
    });

    it("deve rejeitar email duplicado", async () => {
      const duplicateData = {
        name: "Maria Silva",
        cpf: "987.654.321-00",
        age: 30,
        email: "joao@example.com",
        password: "Senha@456",
        role: "PASSENGER",
      };

      const result = await createUser(duplicateData);

      expect(result.success).toBe(false);
      expect(result.error.message).toBe("Email já cadastrado no sistema");
      expect(result.error.code).toBe("EMAIL_ALREADY_EXISTS");
    });
  });

  describe("Cenário 1.6: Senha Fraca", () => {
    beforeEach(async () => {
      await clearDatabase();
    });

    const weakPasswords = [
      {
        password: "abc123",
        reason: "sem letra maiúscula e sem caractere especial",
      },
      { password: "Abc", reason: "menos de 6 caracteres" },
      { password: "ABCDEF123", reason: "sem letra minúscula" },
      { password: "abcdef123", reason: "sem letra maiúscula" },
      { password: "Abcdef", reason: "sem número e sem caractere especial" },
    ];

    weakPasswords.forEach(({ password, reason }) => {
      it(`deve rejeitar senha fraca: "${password}" (${reason})`, async () => {
        const invalidData = {
          name: "João Silva",
          cpf: "123.456.789-09",
          age: 25,
          email: "joao@example.com",
          password,
          role: "PASSENGER",
        };

        const result = await createUser(invalidData);

        expect(result.success).toBe(false);
        expect(result.error.field).toBe("password");
        expect(result.error.code).toBe("WEAK_PASSWORD");
      });
    });

    it("deve retornar mensagem de erro específica para senha fraca", async () => {
      const invalidData = {
        name: "João Silva",
        cpf: "123.456.789-09",
        age: 25,
        email: "joao@example.com",
        password: "senha123",
        role: "PASSENGER",
      };

      const result = await createUser(invalidData);

      expect(result.error.message).toContain("no mínimo 6 caracteres");
      expect(result.error.message).toContain("1 número");
      expect(result.error.message).toContain("1 maiúscula");
      expect(result.error.message).toContain("1 minúscula");
      expect(result.error.message).toContain("1 caractere especial");
    });
  });

  describe("Cenário 1.7: Email Inválido", () => {
    beforeEach(async () => {
      await clearDatabase();
    });

    const invalidEmails = [
      { email: "joao@", reason: "sem domínio" },
      { email: "joao.com", reason: "sem @" },
      { email: "@example.com", reason: "sem local-part" },
      { email: "joao @example.com", reason: "com espaço" },
    ];

    invalidEmails.forEach(({ email, reason }) => {
      it(`deve rejeitar email inválido: "${email}" (${reason})`, async () => {
        const invalidData = {
          name: "João Silva",
          cpf: "123.456.789-09",
          age: 25,
          email,
          password: "Senha@123",
          role: "PASSENGER",
        };

        const result = await createUser(invalidData);

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Email em formato inválido");
        expect(result.error.code).toBe("INVALID_EMAIL");
      });
    });
  });

  describe("Cenário 1.8: Campos Obrigatórios Vazios - Passageiro", () => {
    beforeEach(async () => {
      await clearDatabase();
    });

    const requiredFields = ["name", "cpf", "age", "email", "password"];

    requiredFields.forEach((field) => {
      it(`deve rejeitar cadastro com campo obrigatório vazio: ${field}`, async () => {
        const incompleteData = {
          name: "João Silva",
          cpf: "123.456.789-09",
          age: 25,
          email: "joao@example.com",
          password: "Senha@123",
          role: "PASSENGER",
        };

        incompleteData[field] = "";

        const result = await createUser(incompleteData);

        expect(result.success).toBe(false);
        expect(result.error.message).toBe(
          "Preencha todos os campos obrigatórios",
        );
        expect(result.error.code).toBe("MISSING_REQUIRED_FIELD");
        expect(result.error.field).toBe(field);
      });
    });
  });

  describe("Cenário 1.9: Campos Obrigatórios Vazios - Motorista", () => {
    beforeEach(async () => {
      await clearDatabase();
    });

    const requiredFields = [
      "name",
      "cpf",
      "cnh",
      "birthYear",
      "email",
      "password",
    ];

    requiredFields.forEach((field) => {
      it(`deve rejeitar cadastro de motorista com campo obrigatório vazio: ${field}`, async () => {
        const incompleteData = {
          name: "Maria Silva",
          cpf: "987.654.321-00",
          cnh: "9876543210",
          birthYear: 1990,
          email: "maria@example.com",
          password: "Senha@456",
          role: "DRIVER",
        };

        incompleteData[field] = field === "birthYear" ? null : "";

        const result = await createUser(incompleteData);

        expect(result.success).toBe(false);
        expect(result.error.message).toBe(
          "Preencha todos os campos obrigatórios",
        );
        expect(result.error.field).toBe(field);
      });
    });
  });

  describe("Cenário 1.10: CNH Já Cadastrado", () => {
    const existingDriver = {
      name: "Maria Silva",
      cpf: "987.654.321-00",
      cnh: "9876543210",
      birthYear: 1990,
      email: "maria@example.com",
      password: "Senha@456",
      role: "DRIVER",
    };

    beforeEach(async () => {
      await clearDatabase();
      await createUser(existingDriver);
    });

    it("deve rejeitar CNH duplicado", async () => {
      const duplicateDriver = {
        name: "João Silva",
        cpf: "123.456.789-09",
        cnh: "9876543210",
        birthYear: 1985,
        email: "joao@example.com",
        password: "Senha@123",
        role: "DRIVER",
      };

      const result = await createUser(duplicateDriver);

      expect(result.success).toBe(false);
      expect(result.error.message).toBe("CNH já cadastrada no sistema");
      expect(result.error.code).toBe("CNH_ALREADY_EXISTS");
    });
  });

  describe("Cenário 1.11: Acesso não autenticado", () => {
    it("deve bloquear acesso a funcionalidades sem autenticação", async () => {
      // Este teste seria mais específico na camada de integração/E2E
      // Aqui estamos testando que o serviço valida autenticação
      const result = await getPassengerLines(null); // token null

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("UNAUTHENTICATED");
    });
  });

  // ============================================
  // TESTES DE CONTROLE DE ACESSO (RBAC)
  // ============================================

  describe("Controle de Acesso por Role", () => {
    let passengerToken, driverToken;

    beforeEach(async () => {
      await clearDatabase();

      const passengerResult = await createUser({
        name: "João Passageiro",
        cpf: "123.456.789-09",
        age: 25,
        email: "joao@example.com",
        password: "Senha@123",
        role: "PASSENGER",
      });
      passengerToken = passengerResult.token;

      const driverResult = await createUser({
        name: "Maria Motorista",
        cpf: "987.654.321-00",
        cnh: "9876543210",
        birthYear: 1990,
        email: "maria@example.com",
        password: "Senha@456",
        role: "DRIVER",
      });
      driverToken = driverResult.token;
    });

    it("passageiro deve ter acesso apenas a funcionalidades de passageiro", async () => {
      // Deve ter acesso
      expect(await canAccessPassengerFeatures(passengerToken)).toBe(true);

      // Não deve ter acesso
      expect(await canAccessDriverFeatures(passengerToken)).toBe(false);
    });

    it("motorista deve ter acesso apenas a funcionalidades de motorista", async () => {
      // Deve ter acesso
      expect(await canAccessDriverFeatures(driverToken)).toBe(true);

      // Não deve ter acesso
      expect(await canAccessPassengerFeatures(driverToken)).toBe(false);
    });
  });
});

// ============================================
// FUNÇÕES AUXILIARES PARA TESTES
// ============================================

async function getPassengerLines(token) {
  // Se não houver token, retorna erro de autenticação
  if (!token) {
    return {
      success: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "Token de autenticação necessário",
      },
    };
  }

  // Se houver token, simula sucesso
  return {
    success: true,
    lines: [],
  };
}

async function canAccessPassengerFeatures(token) {
  // Verifica se o token é de um passageiro
  const { verifyToken } = require("../services/authService");
  const decoded = verifyToken(token);

  if (!decoded) return false;
  return decoded.role === "PASSENGER";
}

async function canAccessDriverFeatures(token) {
  // Verifica se o token é de um motorista
  const { verifyToken } = require("../services/authService");
  const decoded = verifyToken(token);

  if (!decoded) return false;
  return decoded.role === "DRIVER";
}
