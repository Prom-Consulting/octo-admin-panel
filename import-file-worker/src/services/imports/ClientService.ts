import { Model, DataTypes, Sequelize } from "sequelize";
import { generateClientId } from "../../utils/generateClientId";
import { getTenantModel } from "../../../db/tenantDb.ts";

export class Client extends Model {
  declare id: string;
  declare first_name: string;
  declare last_name: string | null;
  declare phone_number: string;
  declare source_type: string;
  declare is_active: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initClientModel = (sequelize: Sequelize) => {
  Client.init(
    {
      id: { type: DataTypes.STRING, primaryKey: true },
      first_name: { type: DataTypes.STRING, allowNull: false },
      last_name: { type: DataTypes.STRING, allowNull: true },
      phone_number: { type: DataTypes.STRING, allowNull: false },
      source_type: { type: DataTypes.STRING, allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: "organization_clients",
      sequelize,
      timestamps: true,
    }
  );
  return Client;
};

export class ClientService {
  private clientModel: typeof Client;

  constructor(tenantDb: Sequelize) {
    this.clientModel = getTenantModel(tenantDb, "organization_clients", initClientModel);

    this.clientModel.sync()
      .then(() => console.log("📦 organization_clients ready in tenant DB"))
      .catch(err => console.log("❌ Sync error:", err));
  }

  async findOrCreate(name: string, phone: string) {
    const existing = await this.clientModel.findOne({
      where: { first_name: name.trim(), phone_number: phone },
    });

    if (existing) return existing;

    const newClient = await this.clientModel.create({
      id: generateClientId("import"),
      source_type: "import",
      first_name: name.trim(),
      last_name: null,
      phone_number: phone,
      is_active: true,
    });

    console.log(`✅ Created new client: ${newClient.first_name}`);
    return newClient;
  }
}
