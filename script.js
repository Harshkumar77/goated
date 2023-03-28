import { PrismaClient } from "@prisma/client"
import { exec } from "child_process"
import { promisify } from "util"
const run = promisify(exec)

const prisma = new PrismaClient()
;(async () => {
  const episodes = await prisma.episode.findMany()
  const lengths = Promise.all(
    episodes.map(async ({ id, path }) => {
      const { stdout, stderr } = await run(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${path}"`
      )
      const length = Number(Number(stdout).toFixed(0))
      return length
    })
  )
  await prisma.$transaction(
    (
      await lengths
    ).map((length, i) => {
      return prisma.episode.update({
        where: {
          id: episodes[i].id,
        },
        data: {
          length,
        },
      })
    })
  )

  // try {
  console.log(await lengths)
  //   console.log(`${id}-${updated.length}`)
  // } catch (error) {
  //   console.log(`Cant update ${id}-${length}`)
  // }
  //   })
  //   console.log(await prisma.$transaction(queries))
})()
