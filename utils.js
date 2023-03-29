import chalk from "chalk"
import { exec } from "child_process"
import { randomInt } from "crypto"
import { search } from "fast-fuzzy"
import inquirer from "inquirer"
import path, { basename } from "path"
import { promisify } from "util"
import { prisma } from "./index.js"

export async function playPath(path, command = "") {
  exec(`vlc "${path}" ${command} -f &>/dev/null &`, {
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
    ...(await insertInHistory(path)),
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

export async function insertInHistory(path) {
  const history = await prisma.history.findMany({
    orderBy: {
      createdAt: "asc",
    },
  })
  if (history.length === 100)
    return [
      prisma.history.delete({
        where: {
          createdAt: history[0].createdAt,
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
    ]
  return [
    prisma.history.create({
      data: {
        episode: {
          connect: {
            path,
          },
        },
      },
    }),
  ]
}

export async function videoLength(path) {
  const { stdout, stderr } = await promisify(exec)(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${path}"`
  )
  if (stderr) throw stderr
  return Number(Number(stdout).toFixed(0))
}

export function getFilePath(file) {
  if (file[0] == "/" || file[0] == "~") return path.normalize(file)
  return path.join(process.cwd(), file)
}
