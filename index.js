#!/usr/bin/env node
import * as dotenv from "dotenv"
dotenv.config()
import { PrismaClient } from "@prisma/client"
import { Command } from "commander"
import inquirer from "inquirer"
import inquirerPrompt from "inquirer-autocomplete-prompt"
import {
  addScene,
  deleteFromDB,
  from,
  history,
  init,
  play,
  playScene,
  progress,
  searchKeyword,
  studio,
  add,
} from "./actions.js"
import { initializeDB } from "./utils.js"

export const program = new Command()
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.NODE_ENV === "development"
          ? process.env.DATABASE_URL
          : `file:${process.env.HOME}/.goatedDB`,
    },
  },
})

inquirer.registerPrompt("autocomplete", inquirerPrompt)
initializeDB()

program
  .name("goated")
  .description("CLI to play a random episode from the goated series")
  .version("1.0.0")

program.option("-f --file <file>", "file with full path")
program.option(
  "-b --batch-files <files path>",
  "files with full path seperated by \\n"
)
program.option("-s --series <series name>", "search in old series name")
program.option("-i --info", "show info")
program.option("--start <start time>", "search in old series name")
program.option("--end <end time>", "search in old series name")
program.option("--scene-name <scene name>", "search in old series name")

program.command("play").action(play)

program
  .command("add <files...>")
  .action(add)
  .description(
    `Add episodes in batch\nExample - goated add-batch -b "$(ls $PWD/*.mkv)" -s californication`
  )

program
  .command("from")
  .action(from)
  .description(`Select random episode from specific series`)

program
  .command("search <keyword>")
  .action(searchKeyword)
  .description(`Search series name`)

program
  .command("delete [episode-or-series-or-scene-id-or-name]")
  .action(deleteFromDB)
  .description(`Delete a series`)

program.command("progress").action(progress).description("Check your progrss")

program.command("history").action(history).description("Checkout your history")

program
  .command("scene")
  .action(playScene)
  .addCommand(new Command("add").action(addScene).addArgument("<id-or-path"))

program
  .command("studio")
  .action(studio)
  .description("A GUI for deleting or editing data")

program.command("init").action(init).description("initialise the command line")

program.parse()
