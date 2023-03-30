import chalk from "chalk"
import { exec, execFile } from "child_process"
import { randomInt } from "crypto"
import { search } from "fast-fuzzy"
import inquirer from "inquirer"
import path, { basename, dirname } from "path"
import { promisify } from "util"
import { prisma } from "./index.js"
import { existsSync, copyFileSync } from "node:fs"
import { fileURLToPath } from "url"
import { readFileSync } from "fs"

export async function playPath(
  path,
  command = "",
  media = "episode",
  id = null
) {
  exec(`vlc "${path}" ${command} -f &>/dev/null &`, {
    shell: "bash",
  })
  if (media === "episode")
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
  if (media === "scene") {
    if (!id) throw Error("id not provided in playPath - utils.js")
    return prisma.$transaction([
      prisma.scenes.update({
        where: {
          id,
        },
        data: {
          views: {
            increment: 1,
          },
        },
      }),
      ...(await insertInHistory(path)),
    ])
  }
  throw Error("invalid media provided to playpath - utils.js" + media)
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

export async function sceneSelector() {
  const allScenes = await prisma.scenes.findMany({
    include: { episode: true },
    orderBy: {
      views: "desc",
    },
  })
  const sceneTitles = allScenes.map(({ name }) => name)
  const sceneToEpisodeMap = new Map()
  sceneTitles.forEach((_, i) => {
    sceneToEpisodeMap.set(_, allScenes[i])
  })
  return await inquirer.prompt({
    type: "autocomplete",
    suggestOnly: false,
    message: "-",
    emptyText: "Nothing found!",
    name: "scene",
    source: (_, input = "") => {
      const results = search(input, sceneTitles, {
        returnMatchData: true,
        keySelector: (_) => _,
        ignoreCase: true,
      }).map((_) => _.item)
      return results.length ? results : sceneTitles
    },
    filter: (_) => sceneToEpisodeMap.get(_),
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

export function timeStringToSeconds(timeString) {
  const timeParts = timeString.split(":").map(parseFloat)
  let seconds = 0
  if (timeParts.length === 3) {
    seconds += timeParts[0] * 3600
    seconds += timeParts[1] * 60
    seconds += timeParts[2]
  } else if (timeParts.length === 2) {
    seconds += timeParts[0] * 60
    seconds += timeParts[1]
  } else if (timeParts.length === 1) {
    seconds += timeParts[0]
  }
  return seconds
}

export function initializeDB() {
  if (process.env.NODE_ENV === "development") return true
  if (existsSync(`${process.env.HOME}/.goatedDB`)) return true
  const src = `${fileURLToPath(dirname(import.meta.url))}/prisma/sample.db`
  const dest = `${process.env.HOME}/.goatedDB`
  copyFileSync(src, dest)
}

export function version() {
  const rawJSON = readFileSync(
    `${fileURLToPath(dirname(import.meta.url))}/package.json`
  )
  return JSON.parse(rawJSON).version
}
