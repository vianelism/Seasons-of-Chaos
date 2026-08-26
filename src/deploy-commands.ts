import { REST, Routes } from "discord.js";
import { commandData } from "./commands.js";
import { env } from "./env.js";

const rest = new REST({ version: "10" }).setToken(env.token);
if (env.guildId) {
  await rest.put(Routes.applicationGuildCommands(env.clientId, env.guildId), { body: commandData });
  console.log(`Deployed ${commandData.length} commands to guild ${env.guildId}.`);
} else {
  await rest.put(Routes.applicationCommands(env.clientId), { body: commandData });
  console.log(`Deployed ${commandData.length} global commands. Global changes can take time to appear.`);
}
