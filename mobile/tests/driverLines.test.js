const { describe, it, mock, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

// Mock do apiService para isolar o serviço de rede
const mockGet = mock.fn();
const mockPost = mock.fn();
const mockPatch = mock.fn();
const mockDelete = mock.fn();

mock.module("../services/api", {
  namedExports: {
    apiService: {
      get: mockGet,
      post: mockPost,
      patch: mockPatch,
      delete: mockDelete,
    },
  },
});

const {
  getDriverLines,
  getLineById,
  createLine,
  addLinePoint,
  updateLinePoint,
  removeLinePoint,
  generateLineInvite,
  searchIBGECities,
} = require("../services/driverLines");

describe("driverLines service", () => {
  beforeEach(() => {
    mockGet.mock.resetCalls();
    mockPost.mock.resetCalls();
    mockPatch.mock.resetCalls();
    mockDelete.mock.resetCalls();
  });

  // M2.2 - Lista de linhas
  describe("getDriverLines", () => {
    it("retorna lista de linhas com sucesso", async () => {
      const lines = [
        { id: "line-1", originCity: "Caçapava", destinationPlace: "Fatec-SJC" },
      ];
      mockGet.mock.implementation = async () => ({ data: { success: true, lines } });

      const result = await getDriverLines();

      assert.equal(result.success, true);
      assert.equal(result.lines.length, 1);
      assert.equal(result.lines[0].id, "line-1");
    });

    it("retorna erro em falha de rede", async () => {
      mockGet.mock.implementation = async () => {
        throw { response: { data: { error: { code: "NETWORK_ERROR", message: "Sem conexão" } } } };
      };

      const result = await getDriverLines();

      assert.equal(result.success, false);
      assert.ok(result.error?.message);
    });
  });

  // M2.4 - Criar linha
  describe("createLine", () => {
    it("cria linha com sucesso com dados mínimos", async () => {
      const line = { id: "line-2", originCity: "Caçapava", destinationPlace: "Fatec-SJC", vehicleId: "v1" };
      mockPost.mock.implementation = async () => ({ data: { success: true, line } });

      const result = await createLine({
        originCity: "Caçapava",
        destinationPlace: "Fatec-SJC",
        vehicleId: "v1",
      });

      assert.equal(result.success, true);
      assert.equal(result.line.id, "line-2");
    });

    it("retorna erro se motorista não tem veículo", async () => {
      mockPost.mock.implementation = async () => {
        throw {
          response: {
            data: {
              success: false,
              error: { code: "LINE_CREATE_FAILED", message: "Você deve cadastrar um veículo antes de criar uma linha" },
            },
          },
        };
      };

      const result = await createLine({ originCity: "Caçapava", destinationPlace: "Fatec-SJC", vehicleId: "v1" });

      assert.equal(result.success, false);
      assert.ok(result.error?.message.includes("veículo"));
    });
  });

  // M2.13 - Adicionar ponto
  describe("addLinePoint", () => {
    it("adiciona ponto com sucesso", async () => {
      const point = { id: "pt-1", address: "Rua A, 100", type: "pickup", segment: "ida" };
      mockPost.mock.implementation = async () => ({ data: { success: true, point } });

      const result = await addLinePoint("line-1", { address: "Rua A, 100", type: "pickup", segment: "ida" });

      assert.equal(result.success, true);
      assert.equal(result.point.id, "pt-1");
    });

    it("retorna erro se endereço está vazio", async () => {
      mockPost.mock.implementation = async () => {
        throw {
          response: {
            data: {
              success: false,
              error: { code: "POINT_CREATE_FAILED", message: "Endereço é obrigatório para criar um ponto" },
            },
          },
        };
      };

      const result = await addLinePoint("line-1", { address: "", type: "pickup", segment: "ida" });

      assert.equal(result.success, false);
      assert.ok(result.error?.message.includes("Endereço"));
    });
  });

  // M2.11 - Remover ponto
  describe("removeLinePoint", () => {
    it("remove ponto sem passageiros com sucesso", async () => {
      mockDelete.mock.implementation = async () => ({ data: { success: true, message: "Ponto removido" } });

      const result = await removeLinePoint("line-1", "pt-1");

      assert.equal(result.success, true);
    });

    it("retorna erro ao tentar remover ponto com passageiros", async () => {
      mockDelete.mock.implementation = async () => {
        throw {
          response: {
            data: {
              success: false,
              error: { code: "POINT_DELETE_FAILED", message: "Remova os passageiros vinculados antes de deletar este ponto" },
            },
          },
        };
      };

      const result = await removeLinePoint("line-1", "pt-com-passageiros");

      assert.equal(result.success, false);
      assert.ok(result.error?.message.includes("passageiros"));
    });
  });

  // M2.10 - Gerar convite
  describe("generateLineInvite", () => {
    it("gera token de convite com sucesso", async () => {
      mockPost.mock.implementation = async () => ({
        data: { success: true, data: { token: "abc123", url: "fastvan.app/invite/abc123", expiresAt: "2026-06-09" } },
      });

      const result = await generateLineInvite("line-1");

      assert.equal(result.success, true);
      assert.ok(result.token);
      assert.ok(result.url);
    });
  });

  // M2.6 - Busca IBGE
  describe("searchIBGECities", () => {
    it("retorna cidades que correspondem à busca", async () => {
      const municipios = [
        { id: 1, nome: "Caçapava" },
        { id: 2, nome: "Caçador" },
      ];
      mockGet.mock.implementation = async () => ({ data: municipios });

      const result = await searchIBGECities("Caça");

      assert.equal(result.length, 2);
      assert.equal(result[0].nome, "Caçapava");
    });

    it("retorna lista vazia em erro de rede", async () => {
      mockGet.mock.implementation = async () => { throw new Error("Sem internet"); };

      const result = await searchIBGECities("Caça");

      assert.deepEqual(result, []);
    });
  });
});
