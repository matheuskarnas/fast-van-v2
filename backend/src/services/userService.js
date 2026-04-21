/**
 * User Service
 * Serviço responsável por operações de usuários no banco de dados
 */

const { query, shouldUseDatabase } = require("../config/database");

/**
 * Mock de banco de dados para testes
 * Em produção, isso seria substituído por queries reais ao PostgreSQL
 */
const mockDatabase = {
  users: [],
};

function mapUserRowToDomain(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    cpf: row.cpf,
    email: row.email,
    password: row.password,
    role: row.role,
    cnh: row.cnh,
    birthDate: row.birth_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/**
 * Cria um novo usuário no banco de dados
 * @param {object} userData - Dados do usuário
 * @returns {object} Usuário criado com ID
 */
async function createUserInDB(userData) {
  try {
    if (shouldUseDatabase()) {
      const newUserId = `user_${Date.now()}`;

      const result = await query(
        `
          INSERT INTO users (id, name, cpf, email, password, role, cnh, birth_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, name, cpf, email, role, cnh, birth_date, created_at, updated_at
        `,
        [
          newUserId,
          userData.name,
          userData.cpf,
          userData.email,
          userData.password,
          userData.role,
          userData.cnh || null,
          userData.birthDate,
        ],
      );

      return mapUserRowToDomain(result.rows[0]);
    }

    const newUser = {
      id: `user_${Date.now()}`, // Em produção, seria gerado pelo BD
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock: adiciona ao array
    mockDatabase.users.push(newUser);

    // Retornar sem a senha
    const { password: _password, ...userWithoutPassword } = newUser;
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
    if (shouldUseDatabase()) {
      const result = await query(
        `
          SELECT id, name, cpf, email, password, role, cnh, birth_date, created_at, updated_at, deleted_at
          FROM users
          WHERE email = $1 AND deleted_at IS NULL
        `,
        [email],
      );

      return mapUserRowToDomain(result.rows[0]);
    }

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

    if (shouldUseDatabase()) {
      const result = await query(
        `
          SELECT id, name, cpf, email, password, role, cnh, birth_date, created_at, updated_at, deleted_at
          FROM users
          WHERE cpf = $1 AND deleted_at IS NULL
        `,
        [cleanCPF],
      );

      return mapUserRowToDomain(result.rows[0]);
    }

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
    if (shouldUseDatabase()) {
      const result = await query(
        `
          SELECT id, name, cpf, email, password, role, cnh, birth_date, created_at, updated_at, deleted_at
          FROM users
          WHERE cnh = $1 AND role = 'DRIVER' AND deleted_at IS NULL
        `,
        [cnh],
      );

      return mapUserRowToDomain(result.rows[0]);
    }

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
    if (shouldUseDatabase()) {
      const result = await query(
        `
          SELECT id, name, cpf, email, password, role, cnh, birth_date, created_at, updated_at, deleted_at
          FROM users
          WHERE id = $1
        `,
        [id],
      );

      return mapUserRowToDomain(result.rows[0]);
    }

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
    if (shouldUseDatabase()) {
      const fields = [];
      const values = [];
      let index = 1;

      const fieldMap = {
        name: "name",
        cpf: "cpf",
        email: "email",
        password: "password",
        role: "role",
        cnh: "cnh",
        birthDate: "birth_date",
      };

      for (const [key, dbField] of Object.entries(fieldMap)) {
        if (updateData[key] !== undefined) {
          fields.push(`${dbField} = $${index}`);
          values.push(updateData[key]);
          index += 1;
        }
      }

      if (fields.length === 0) {
        return getUserById(id);
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const result = await query(
        `
          UPDATE users
          SET ${fields.join(", ")}
          WHERE id = $${index}
          RETURNING id, name, cpf, email, role, cnh, birth_date, created_at, updated_at, deleted_at
        `,
        values,
      );

      if (!result.rows[0]) {
        throw new Error("User not found");
      }

      return mapUserRowToDomain(result.rows[0]);
    }

    const userIndex = mockDatabase.users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      throw new Error("User not found");
    }

    mockDatabase.users[userIndex] = {
      ...mockDatabase.users[userIndex],
      ...updateData,
      updatedAt: new Date(),
    };

    const { password: _password, ...userWithoutPassword } = mockDatabase.users[userIndex];
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
    if (shouldUseDatabase()) {
      const result = await query(
        `
          UPDATE users
          SET deleted_at = NOW(), updated_at = NOW()
          WHERE id = $1
          RETURNING id
        `,
        [id],
      );

      if (!result.rows[0]) {
        throw new Error("User not found");
      }

      return true;
    }

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
    if (shouldUseDatabase()) {
      const result = await query(
        `
          SELECT id, name, cpf, email, role, cnh, birth_date, created_at, updated_at, deleted_at
          FROM users
          WHERE deleted_at IS NULL
          ORDER BY created_at DESC
        `,
      );

      return result.rows.map((row) => mapUserRowToDomain(row));
    }

    return mockDatabase.users
      .filter((user) => !user.deletedAt)
      .map(({ password: _password, ...user }) => user);
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
}

/**
 * Limpa banco de dados (apenas para testes)
 */
async function clearDatabase() {
  if (shouldUseDatabase()) {
    await query("TRUNCATE TABLE users");
    return;
  }

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
