#!/usr/bin/env node
import { PrismaClient } from "@prisma/client"
import { Command } from "commander"
import inquirer from "inquirer"
import inquirerPrompt from "inquirer-autocomplete-prompt"
import {
  add,
  addBatch,
  addScene,
  deleteSeries,
  from,
  history,
  play,
  progress,
  searchKeyword,
} from "./actions.js"

export const program = new Command()
export const prisma = new PrismaClient()

inquirer.registerPrompt("autocomplete", inquirerPrompt)
prisma.$connect().then(() => {
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

  program.command("play").action(play)

  program
    .command("add <file>")
    .action(add)
    .description(
      `Add single episode\nExample - goated add /path/to/episode.mkv -s californication`
    )

  program
    .command("add-batch <files...>")
    .action(addBatch)
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

  program.command("delete [episode-or-series-or-scene-id]").action(deleteSeries).description(`Delete a series`)

  program.command("progress").action(progress).description("Check your progrss")

  program
    .command("history")
    .action(history)
    .description("Checkout your history")


  // program
  //   .command("scene")
  //   .action(progress)
  //   .addCommand(
  //     new Command("add")
  //       .addArgument("<id>")
  //       .addOption("<start>")
  //       .addArgument("end")
  //       .action(addScene)
  //   )

  program.parse()
})
