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
  add,
} from "./actions.js"
import { checkDB, stucture, version } from "./utils.js"

const struc = stucture()
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
checkDB()

program
  .name("goated")
  .description("CLI to play a random episode from the goated series")
  .version(version())

program.option("-s --series <series name>", "search in old series name")
program.option("-i --info", "show info")
program.option("-S --start <start time>", "search in old series name")
program.option("-E --end <end time>", "search in old series name")
program.option("-sn --scene-name <scene name>", "search in old series name")

program
  .command(struc.play.full)
  .aliases(struc.play.aliases)
  .action(play)
  .description(`Play a complete random episode from the database`)

program
  .command(`${struc.add.full} <files...>`)
  .aliases(struc.add.aliases)
  .action(add)
  .description(`Add episodes in database`)

program
  .command(`${struc.from.full}`)
  .aliases(struc.from.aliases)
  .action(from)
  .description(`Select random episode from specific series`)

program
  .command(`${struc.search.full} <keyword>`)
  .aliases(struc.search.aliases)
  .action(searchKeyword)
  .description(`Search series name`)

program
  .command(`${struc.delete.full} [episode-or-series-or-scene-id-or-name]`)
  .aliases(struc.delete.aliases)
  .action(deleteFromDB)
  .description(`Delete a series`)

program
  .command(`${struc.progress.full}`)
  .aliases(struc.progress.aliases)
  .action(progress)
  .description("Check your progrss")

program
  .command(`${struc.history.full}`)
  .aliases(struc.history.aliases)
  .action(history)
  .description("Checkout your history")

program
  .command(`${struc.scene.full}`)
  .aliases(struc.scene.aliases)
  .action(playScene)
  .addCommand(new Command("add").action(addScene).addArgument("<id-or-path"))

program.command("init").action(init).description("initialise the command line")

program.parse()
