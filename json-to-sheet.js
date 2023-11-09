#!/usr/bin/env node

import { readdir } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { removeExtension, readJson, generateMultiSheetExcel } from './utils.js'
import rimraf from 'rimraf'
import { get, set, cloneDeep, unset, concat } from 'lodash-es'

const __dirname = dirname(fileURLToPath(import.meta.url))

const [_node, _script, localesDir, baseLang = 'en', commitHash1, commitHash2] = Array.from(process.argv)

const localesDirPath = resolve(__dirname, localesDir)

/**
 * jsonToSheet
 * @constructor
 * @param {string} localesDir - The relative locales dir
 * @param {string} baseLang - The base language, defaults to 'en'
 * @param {string} commitHash1 - One of the commit hash to compare (optional)
 * @param {string} commitHash2 - The other commit hash to compare (optional)
 */
export const jsonToSheet = async (localesDir, baseLang, commitHash1, commitHash2) => {
	try {
		const langs = ((await readdir(localesDirPath, { withFileTypes: true })) ?? [])
			.filter((dir) => dir.isDirectory() && !dir.name.startsWith('.'))
			.map((dir) => dir.name)

		if (!langs.includes(baseLang)) {
			throw new Error(`Base language ${baseLang} not found in ${localesDirPath}`)
		}

		// Make sure baseLang is always the first item.
		const baseLangIndex = langs.findIndex((lang) => lang === baseLang)
		langs.splice(baseLangIndex, 1)
		langs.unshift(baseLang)

		const files = ((await readdir(resolve(localesDirPath, baseLang))) ?? []).filter((file) => !file.startsWith('.'))
		const namespaces = files.map((file) => removeExtension(file))

		console.log(namespaces)

		if (commitHash1 && commitHash2) {
			return
		} else {
			const promises = files.map((file) => jsonToSheetsData(langs, file))
			const rows = await Promise.all(promises)
			const sheets = rows.map((rows, index) => ({
				rows,
				sheetName: removeExtension(files[index]),
			}))
			generateMultiSheetExcel(sheets, {
				filename: 'i18n',
			})
			console.log('Success!!!')
		}
	} catch (err) {
		console.error(err)
	}
}

const jsonToSheetsData = async (langs, filename) => {
	const promises = langs.map((lang) => readJson(resolve(localesDirPath, lang, filename)))
	const results = await Promise.all(promises)
	const langData = results.map((item, index) => ({
		lang: langs[index],
		data: normalizeData(item),
	}))
	const baseLangData = langData.shift()
	const multiLang = Object.entries(baseLangData.data).map(([key, value]) => {
		const values = langData.reduce(
			(accu, curr) => {
				accu[curr.lang] = get(curr.data, key)
				return accu
			},
			{ key, [baseLangData.lang]: value },
		)
		return values
	})
	return multiLang
}

const normalizeData = (obj, fullData = {}, parentKey = '') => {
	Object.entries(obj).map(([key, value]) => {
		const fullKey = [parentKey, key].filter((item) => item).join('.')
		if (typeof value === 'object') {
			normalizeData(value, fullData, fullKey)
		} else {
			set(fullData, fullKey, value)
		}
	})

	return fullData
}

jsonToSheet(localesDir, baseLang, commitHash1, commitHash2)
