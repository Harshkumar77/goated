#!/usr/bin/env node
import { Command } from "commander"
import { PrismaClient } from "@prisma/client"
import { execSync } from "child_process"
import chalk from "chalk"
import inquirer from "inquirer"
import inquirerPrompt from "inquirer-autocomplete-prompt"
import fuzzy from "fuzzy"

const program = new Command()
const prisma = new PrismaClient()
inquirer.registerPrompt("autocomplete", inquirerPrompt)
await prisma.$connect()

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

program.command("play").action(async () => {
  let unwatchedEpisodes = await prisma.episode.findMany({
    where: {
      watched: false,
    },
  })
  if (
    unwatchedEpisodes.length === 0 &&
    (await prisma.episode.findMany()).length === 0
  ) {
    console.error(chalk.red("Add some episodes you lazy"))
    process.exit(1)
  }
  if (unwatchedEpisodes.length === 0) {
    await prisma.episode.updateMany({
      data: {
        watched: false,
      },
    })
    unwatchedEpisodes = await prisma.episode.findMany({
      where: {
        watched: false,
      },
    })
  }
  const randomEpisodeIndex = Math.floor(
    Math.random() * unwatchedEpisodes.length
  )
  const randomEpisode = unwatchedEpisodes[randomEpisodeIndex]
  execSync(`xdg-open "${randomEpisode.path}"`)
  await prisma.episode.update({
    where: {
      id: randomEpisode.id,
    },
    data: {
      watched: true,
    },
  })
  if (program.opts().info) console.log(randomEpisode)
  process.exit(0)
})

program
  .command("add")
  .action(async () => {
    const { file, series } = program.opts()
    if (!file) return console.error(chalk.red("No file provided"))
    if (!series) return console.error(chalk.red("No series provided"))
    await prisma.episode.create({
      data: {
        path: file,
        series: {
          connectOrCreate: {
            where: {
              name: series,
            },
            create: {
              name: series,
            },
          },
        },
      },
    })
    console.log("Episode added to existing series")
  })
  .description(
    `Add single episode\nExample - goated add /path/to/episode.mkv -s californication`
  )

program
  .command("add-batch")
  .action(async () => {
    const { batchFiles, series } = program.opts()
    if (!batchFiles) return console.error(chalk.red("No file provided"))
    if (!series) return console.error(chalk.red("No series provided"))
    const filesArray = batchFiles.split("\n")
    const existingSeries = await prisma.series.findUnique({
      where: {
        name: series,
      },
    })
    if (!existingSeries) {
      await prisma.series.create({
        data: {
          name: series,
        },
        select: { id: true },
      })
      console.log(chalk.green.bold(`New series - ${series} added`))
    }
    await prisma.series.update({
      where: {
        name: series,
      },
      data: {
        Episode: {
          create: filesArray.map((path) => {
            return {
              path,
            }
          }),
        },
      },
    })
    console.log(chalk.green.bold(`${filesArray.length} episodes added`))
  })
  .description(
    `Add episodes in batch\nExample - goated add-batch -b "$(ls $PWD/*.mkv)" -s californication`
  )

program
  .command("from")
  .action(async () => {
    const allSeries = (
      await prisma.series.findMany({
        select: {
          name: true,
        },
      })
    ).map(({ name }) => name)
    if (allSeries.length === 0) {
      console.error(chalk.red("Add some episodes you lazy"))
      process.exit(1)
    }
    const { series } = await inquirer.prompt({
      type: "autocomplete",
      suggestOnly: false,
      message: "What you want to watch",
      emptyText: "Nothing found!",
      name: "series",
      source: (_, input = "") => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(fuzzy.filter(input, allSeries).map((el) => el.original))
          }, Math.random() * 470 + 30)
        })
      },
      pageSize: 10,
    })
    let episodes = (
      await prisma.series.findUniqueOrThrow({
        where: {
          name: series,
        },
        include: {
          Episode: true,
        },
      })
    ).Episode
    let unwatchedEpisodes = episodes.filter((_) => !_.watched)
    if (unwatchedEpisodes.length === 0 && episodes.length !== 0) {
      await prisma.episode.updateMany({
        where: {
          series: {
            name: series,
          },
        },
        data: {
          watched: false,
        },
      })
      episodes = (
        await prisma.series.findUniqueOrThrow({
          where: {
            name: series,
          },
          include: {
            Episode: true,
          },
        })
      ).Episode
      unwatchedEpisodes = episodes.filter((_) => !_.watched)
    }
    if (episodes.length === 0) {
      console.error(chalk.red("Add some episodes you lazy"))
      process.exit(1)
    }
    const randomEpisodeIndex = Math.floor(
      unwatchedEpisodes.length * Math.random()
    )
    const randomEpisodePath = unwatchedEpisodes[randomEpisodeIndex].path
    execSync(`xdg-open "${randomEpisodePath}"`)
    if (program.opts().info) console.log(unwatchedEpisodes[randomEpisodeIndex])
    process.exit(0)
  })
  .description(`Select random episode from specific series`)

program
  .command("delete")
  .action(async () => {
    const allSeries = (
      await prisma.series.findMany({
        select: {
          name: true,
        },
      })
    ).map(({ name }) => name)
    if (allSeries.length === 0) {
      console.error(chalk.red("Add some episodes you lazy"))
      process.exit(1)
    }
    const { series } = await inquirer.prompt({
      type: "autocomplete",
      suggestOnly: false,
      message: "What you want to watch",
      emptyText: "Nothing found!",
      name: "series",
      source: (_, input = "") => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(fuzzy.filter(input, allSeries).map((el) => el.original))
          }, Math.random() * 470 + 30)
        })
      },
      pageSize: 10,
    })
    await prisma.series.delete({
      where: {
        name: series,
      },
    })
    console.log(chalk.green.bold(`${series} deleted from list`))
    process.exit(0)
  })
  .description(`Delete a series`)

program.parse()
