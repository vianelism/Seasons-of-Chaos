import { SlashCommandBuilder } from "discord.js";

export const commandData = [
  new SlashCommandBuilder()
    .setName("passport")
    .setDescription("View your seasonal passport (or peek at someone else's).")
    .addUserOption((option) => option.setName("user").setDescription("The member whose passport you want to view"))
    .addStringOption((option) => option.setName("season").setDescription("Filter the lifetime passport by season").setAutocomplete(true)),
  new SlashCommandBuilder()
    .setName("stamps")
    .setDescription("Browse public Seasons of Chaos stamps.")
    .addStringOption((option) => option.setName("season").setDescription("Show stamps from one season").setAutocomplete(true)),
  new SlashCommandBuilder()
    .setName("seasons")
    .setDescription("Browse current, upcoming, and archived Seasons of Chaos collections."),
  new SlashCommandBuilder()
    .setName("rewards")
    .setDescription("View seasonal and lifetime reward progress.")
    .addUserOption((option) => option.setName("user").setDescription("The member whose reward progress you want to view")),
  new SlashCommandBuilder()
    .setName("award")
    .setDescription("Award a passport stamp to a member.")
    .addUserOption((option) => option.setName("user").setDescription("The stamp recipient").setRequired(true))
    .addStringOption((option) => option.setName("stamp").setDescription("The stamp to award").setAutocomplete(true).setRequired(true))
    .addBooleanOption((option) => option.setName("announce").setDescription("Announce the achievement publicly (default: yes)")),
  new SlashCommandBuilder()
    .setName("revoke")
    .setDescription("Remove a mistakenly awarded passport stamp.")
    .addUserOption((option) => option.setName("user").setDescription("The member whose stamp should be removed").setRequired(true))
    .addStringOption((option) => option.setName("stamp").setDescription("The stamp to remove").setAutocomplete(true).setRequired(true)),
].map((command) => command.toJSON());
