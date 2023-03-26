import chalk from "chalk"
import { execSync } from "child_process"
import { randomInt } from "crypto"
import { search } from "fast-fuzzy"
import inquirer from "inquirer"
import { prisma, program } from "./index.js"

export function playPath(path) {
  execSync(`vlc "${path}" &>/dev/null &`, {
    shell: "bash",
  })
  return prisma.episode.update({
    where: {
      path: path,
    },
    data: {
      watched: true,
    },
  })
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
