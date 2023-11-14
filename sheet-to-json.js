#!/usr/bin/env node

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseMultiSheetExcel, readJson } from './utils.js'
import { get, set } from 'lodash-es'
import { simpleGit } from 'simple-git'

const __dirname = dirname(fileURLToPath(import.meta.url))

const [_node, _script, xlsxFile, localesDir] = Array.from(process.argv)

const localesDirPath = resolve(__dirname, localesDir ?? './output')
console.log(localesDirPath)

export const sheetToJson = async (xlsxFile, localesDirPath) => {
	try {
		const data = parseMultiSheetExcel(xlsxFile)
		const promises = Object.entries(data).map(([namespace, jsonData]) => dataToJson(namespace, jsonData))
		const mergedResults = (await Promise.all(promises)) ?? []
		const writeJsonPromises = mergedResults.reduce((accu, item) => {
			Object.entries(item).forEach(([namespace, mutliLangData]) => {
				Object.entries(mutliLangData).forEach(([lang, jsonData]) => {
					const outputPath = resolve(localesDirPath, lang, `${namespace}.json`)
					console.log('Writing to file:', outputPath)
					accu.push(writeToJson(jsonData, outputPath))
				})
			})
			return accu
		}, [])
		await Promise.all(writeJsonPromises)
	} catch (err) {
		console.error(err)
	}
}

const transpileData = (excelData) => {
	return excelData.reduce((accu, row) => {
		const { key, ...rest } = row
		Object.entries(rest).forEach(([lang, value]) => {
			set(accu, `${lang}.${key}`, value)
		})
		return accu
	}, {})
}

const dataToJson = async (namespace, excelData) => {
	try {
		const data = transpileData(excelData)
		const langs = Object.keys(data).sort((a, b) => a.localeCompare(b))
		const promises = langs.map((lang) => readJson(resolve(localesDirPath, lang, `${namespace}.json`), true))
		const existedFiles = ((await Promise.all(promises)) ?? []).reduce((accu, curr, index) => {
			set(accu, `${langs[index]}`, curr)
			return accu
		}, {})
		const merged = Object.entries(data).reduce((accu, [lang, jsonData]) => {
			set(accu, `${lang}`, { ...get(existedFiles, `${lang}`, {}), ...jsonData })
			return accu
		}, {})
		return { [namespace]: merged }
	} catch (err) {
		console.log(err)
	}
}

const writeToJson = async (data, filePath) => {
	if (!existsSync(filePath)) {
		await mkdir(dirname(filePath), { recursive: true })
	}
	await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

sheetToJson(xlsxFile, localesDirPath)
