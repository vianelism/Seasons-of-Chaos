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
  new SlashCommandBuilder()
    .setName("setup-channel")
    .setDescription("Choose a channel for automatic stamp tracking.")
    .addStringOption((option) => option.setName("kind").setDescription("What happens in this channel").setRequired(true)
      .addChoices(
        { name: "Seasonal conversation", value: "seasonal" }, { name: "Photo sharing", value: "photos" },
        { name: "Movie night", value: "movie-night" }, { name: "Game night", value: "game-night" },
      ))
    .addChannelOption((option) => option.setName("channel").setDescription("Channel to watch").setRequired(true)),
  new SlashCommandBuilder()
    .setName("automation-status")
    .setDescription("Show which channels the passport office watches."),
  new SlashCommandBuilder()
    .setName("check-in")
    .setDescription("Claim an activity stamp automatically—no moderator approval needed.")
    .addStringOption((option) => option.setName("activity").setDescription("What you joined or shared").setRequired(true)
      .addChoices(
        { name: "Cozy moment", value: "cozy-af" }, { name: "Outdoor fall moment", value: "outside-ish" },
        { name: "Sweater/weather survival", value: "sweater-weather-survivor" }, { name: "Seasonal treat", value: "little-treat-committee" },
        { name: "Pumpkin or craft", value: "pumpkin-problems" }, { name: "Costume", value: "costume-department" },
        { name: "Candy discussion", value: "candy-tax-auditor" }, { name: "Brought a dish", value: "i-brought-a-dish" },
        { name: "Gratitude or small win", value: "grateful-ish" }, { name: "Leftovers/recovery", value: "leftovers-legend" },
      )),
  new SlashCommandBuilder()
    .setName("setup-rewards")
    .setDescription("Create and connect automatic Fall reward roles."),
  new SlashCommandBuilder()
    .setName("chaos-help")
    .setDescription("Show how Seasons of Chaos stamps and rewards work."),
  new SlashCommandBuilder()
    .setName("emojis")
    .setDescription("Browse or post a Seasons of Chaos community emoji.")
    .addStringOption((option) => option.setName("name").setDescription("Emoji to post; leave blank to browse").setAutocomplete(true)),
].map((command) => command.toJSON());
