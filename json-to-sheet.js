#!/usr/bin/env node

import { readdir } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { removeExtension, readJson, generateMultiSheetExcel } from './utils.js'
import { get, set } from 'lodash-es'
import { simpleGit } from 'simple-git'

const __dirname = dirname(fileURLToPath(import.meta.url))

const [_node, _script, localesDir, fromCommitHash, toCommitHash, baseLang = 'en'] = Array.from(process.argv)

const localesDirPath = resolve(__dirname, localesDir)
const getGitRoot = async () => {
	const git = simpleGit({ baseDir: localesDirPath })
	return git.revparse(['--show-toplevel'])
}

/**
 * jsonToSheet
 * @constructor
 * @param {string} localesDir - The relative locales dir
 * @param {string} fromCommitHash - One of the commit hash to compare (optional)
 * @param {string} toCommitHash - The other commit hash to compare (optional)
 * @param {string} baseLang - The base language, defaults to 'en'
 */
export const jsonToSheet = async (localesDirPath, fromCommitHash, toCommitHash, baseLang) => {
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

		console.log('Processing namespaces:', namespaces.join(', '))

		if (fromCommitHash && toCommitHash) {
			const gitRoot = await getGitRoot()
			const promises = files.map((file) =>
				compareFile(fromCommitHash, toCommitHash, resolve(localesDirPath, baseLang, file).replace(`${gitRoot}/`, '')),
			)
			const results = (await Promise.all(promises)) ?? []
			const updated = results
				.map((jsonData, index) =>
					Object.keys(jsonData ?? {}).length > 0 ? { file: files[index], data: jsonData } : null,
				)
				.filter((item) => item)
			const rowPromises = updated.map(({ file, data }) => jsonToSheetsData(langs, file, { lang: baseLang, data }))

			const rows = await Promise.all(rowPromises)
			const sheets = rows.map((rows, index) => ({
				rows,
				sheetName: removeExtension(updated[index]?.file),
			}))
			generateMultiSheetExcel(sheets, {
				filename: 'i18n',
			})
			console.log('Success!!!')
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

const jsonToSheetsData = async (langs, filename, baseLangData) => {
	const promises = langs.map((lang) => readJson(resolve(localesDirPath, lang, filename)))
	const results = await Promise.all(promises)
	const langData = results.map((item, index) => ({
		lang: langs[index],
		data: normalizeData(item),
	}))
	const _baseLangData = langData.shift()
	return mapMultiLang(baseLangData ?? _baseLangData, langData)
}

const mapMultiLang = (baseLangData, multiLangData) => {
	const multiLang = Object.entries(baseLangData.data).map(([key, value]) => {
		const values = multiLangData.reduce(
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

const compareFile = async (fromCommitSHA, toCommitSHA, filePath) => {
	if (!filePath && !fromCommitHash && toCommitHash) {
		throw new Error('Failed to compare git file, missing parameters.')
	}
	const git = simpleGit({ baseDir: localesDirPath })
	const fromFile = await git.show([`${fromCommitSHA}:${filePath}`])
	const toFile = await git.show([`${toCommitSHA}:${filePath}`])
	const fromData = JSON.parse(fromFile)
	const toData = JSON.parse(toFile)
	return Object.entries(toData).reduce((accu, [key, value]) => {
		if (fromData[key] !== value) {
			accu[key] = value
		}
		return accu
	}, {})
}

jsonToSheet(localesDir, fromCommitHash, toCommitHash, baseLang)
