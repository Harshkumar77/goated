import chalk from "chalk"
import { exec } from "child_process"
import { randomInt } from "crypto"
import { search } from "fast-fuzzy"
import inquirer from "inquirer"
import { prisma } from "./index.js"
import { basename } from "path"

export async function playPath(path, command = "") {
  exec(`vlc "${path}" ${command} &>/dev/null &`, {
    shell: "bash",
  })
  return prisma.$transaction([
    prisma.episode.update({
      where: {
        path: path,
      },
      data: {
        watched: true,
      },
    }),
    prisma.history.create({
      data: {
        episode: {
          connect: {
            path,
          },
        },
      },
    }),
  ])
}

export function error(message) {
  console.error(chalk.red(message))
  process.exit(1)
}

export function ok(message) {
  console.log(chalk.green.bold(message))
}

export function randomElementFromArray(arr) {
  const randomIndex = randomInt(0, arr.length)
  return arr[randomIndex]
}

export async function seriesSelector() {
  const allSeries = (await prisma.series.findMany()).map((_) => _.name)
  return await inquirer.prompt({
    type: "autocomplete",
    suggestOnly: false,
    message: "What you want to watch",
    emptyText: "Nothing found!",
    name: "series",
    source: (_, input = "") => {
      const results = search(input, allSeries, {
        returnMatchData: true,
        keySelector: (_) => _,
        ignoreCase: true,
      }).map((_) => _.item)
      return results.length ? results : allSeries
    },

    pageSize: 10,
  })
}

export async function historySelector() {
  const fullPath = (
    await prisma.history.findMany({
      include: { episode: true },
      orderBy: {
        createdAt: "desc",
      },
    })
  ).map(({ episode: { path } }) => path)
  const basePath = fullPath.map((_) => basename(_))
  const baseToFullMap = new Map()
  basePath.forEach((_, i) => {
    baseToFullMap.set(_, fullPath[i])
  })
  return await inquirer.prompt({
    type: "autocomplete",
    suggestOnly: false,
    message: "-",
    emptyText: "Nothing found!",
    name: "path",
    source: (_, input = "") => {
      const results = search(input, basePath, {
        returnMatchData: true,
        keySelector: (_) => _,
        ignoreCase: true,
      }).map((_) => _.item)
      return results.length ? results : basePath
    },
    filter: (_) => baseToFullMap.get(_),
    pageSize: 10,
  })
}
