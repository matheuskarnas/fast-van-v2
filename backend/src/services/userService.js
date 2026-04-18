/**
 * User Service
 * Serviço responsável por operações de usuários no banco de dados
 */

// Importar cliente do banco de dados (PostgreSQL)
// const db = require('../config/database');

/**
 * Mock de banco de dados para testes
 * Em produção, isso seria substituído por queries reais ao PostgreSQL
 */
const mockDatabase = {
  users: [],
};

/**
 * Cria um novo usuário no banco de dados
 * @param {object} userData - Dados do usuário
 * @returns {object} Usuário criado com ID
 */
async function createUserInDB(userData) {
  try {
    // Em produção, executar query SQL:
    // INSERT INTO users (name, cpf, email, password, role, ...) VALUES (...)

    const newUser = {
      id: `user_${Date.now()}`, // Em produção, seria gerado pelo BD
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock: adiciona ao array
    mockDatabase.users.push(newUser);

    // Retornar sem a senha
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  } catch (error) {
    console.error("Error creating user in DB:", error);
    throw error;
  }
}

/**
 * Busca usuário por email
 * @param {string} email - Email do usuário
 * @returns {object|null} Usuário encontrado ou null
 */
async function getUserByEmail(email) {
  try {
    // Em produção, executar query SQL:
    // SELECT * FROM users WHERE email = $1

    // Mock: busca no array
    return mockDatabase.users.find((user) => user.email === email) || null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  }
}

/**
 * Busca usuário por CPF
 * @param {string} cpf - CPF do usuário (com ou sem máscara)
 * @returns {object|null} Usuário encontrado ou null
 */
async function getUserByCPF(cpf) {
  try {
    // Normaliza CPF removendo máscara
    const cleanCPF = cpf.replace(/[^\d]/g, "");

    // Em produção, executar query SQL:
    // SELECT * FROM users WHERE cpf = $1

    // Mock: busca no array
    return (
      mockDatabase.users.find((user) => {
        const userCPF = user.cpf.replace(/[^\d]/g, "");
        return userCPF === cleanCPF;
      }) || null
    );
  } catch (error) {
    console.error("Error getting user by CPF:", error);
    throw error;
  }
}

/**
 * Busca usuário por CNH (apenas motoristas)
 * @param {string} cnh - CNH do usuário
 * @returns {object|null} Usuário encontrado ou null
 */
async function getUserByCNH(cnh) {
  try {
    // Em produção, executar query SQL:
    // SELECT * FROM users WHERE cnh = $1 AND role = 'DRIVER'

    // Mock: busca no array
    return (
      mockDatabase.users.find(
        (user) => user.cnh === cnh && user.role === "DRIVER",
      ) || null
    );
  } catch (error) {
    console.error("Error getting user by CNH:", error);
    throw error;
  }
}

/**
 * Busca usuário por ID
 * @param {string} id - ID do usuário
 * @returns {object|null} Usuário encontrado ou null
 */
async function getUserById(id) {
  try {
    // Em produção, executar query SQL:
    // SELECT * FROM users WHERE id = $1

    // Mock: busca no array
    return mockDatabase.users.find((user) => user.id === id) || null;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    throw error;
  }
}

/**
 * Atualiza um usuário
 * @param {string} id - ID do usuário
 * @param {object} updateData - Dados a atualizar
 * @returns {object} Usuário atualizado
 */
async function updateUser(id, updateData) {
  try {
    // Em produção, executar query SQL:
    // UPDATE users SET ... WHERE id = $1

    const userIndex = mockDatabase.users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      throw new Error("User not found");
    }

    mockDatabase.users[userIndex] = {
      ...mockDatabase.users[userIndex],
      ...updateData,
      updatedAt: new Date(),
    };

    const { password, ...userWithoutPassword } = mockDatabase.users[userIndex];
    return userWithoutPassword;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

/**
 * Deleta um usuário (soft delete - marca como inativo)
 * @param {string} id - ID do usuário
 * @returns {boolean} True se deletado com sucesso
 */
async function deleteUser(id) {
  try {
    // Em produção, executar query SQL:
    // UPDATE users SET deleted_at = NOW() WHERE id = $1

    const userIndex = mockDatabase.users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      throw new Error("User not found");
    }

    mockDatabase.users[userIndex].deletedAt = new Date();
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

/**
 * Lista todos os usuários (apenas para admin/teste)
 * @returns {array} Lista de usuários
 */
async function getAllUsers() {
  try {
    // Em produção, executar query SQL:
    // SELECT * FROM users WHERE deleted_at IS NULL

    return mockDatabase.users
      .filter((user) => !user.deletedAt)
      .map(({ password, ...user }) => user);
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
}

/**
 * Limpa banco de dados (apenas para testes)
 */
async function clearDatabase() {
  mockDatabase.users = [];
}

/**
 * Adiciona usuário direto no mock (apenas para testes)
 */
function addMockUser(userData) {
  const newUser = {
    id: `user_${Date.now()}`,
    ...userData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockDatabase.users.push(newUser);
  return newUser;
}

module.exports = {
  createUserInDB,
  getUserByEmail,
  getUserByCPF,
  getUserByCNH,
  getUserById,
  updateUser,
  deleteUser,
  getAllUsers,
  clearDatabase,
  addMockUser,
};
