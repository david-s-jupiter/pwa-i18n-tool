import { readFile } from 'fs/promises'
import * as fs from 'fs'
import * as XLSX from 'xlsx/xlsx.mjs'
import { extname } from 'path'

XLSX.set_fs(fs)

/**
 * removeExtension
 * @constructor
 * @param {string} fileWithExtension - File with Extension
 */
export const removeExtension = (fileWithExtension) => {
	if (typeof fileWithExtension !== 'string') {
		throw new Error('removeExtension expects a string')
	}
	const ext = extname(fileWithExtension)
	return fileWithExtension.replace(ext, '')
}

/**
 * parseJson
 * @param {string} jsonFile
 * @returns object
 */
export const readJson = async (jsonFile) => {
	try {
		const content = await readFile(jsonFile, 'utf8')
		return JSON.parse(content)
	} catch (err) {
		console.error(`Failed to parse file: ${jsonFile}`)
	}
}

/**
 * getLangFileFromPath
 * @param {string} path
 */
export const getLangFileFromPath = (path) => {
	if (!path) return path
	const pathArr = path.split('/')
	const filename = pathArr.pop()
	const lang = pathArr.pop()
	return { lang, filename }
}

/**
 * Represents a book.
 * @data
 * @param {string} sheets - [{ rows, headers?, sheetName? }]
 * @param {string} opts - Options of the workbook
 */
export function generateMultiSheetExcel(sheets = [], opts) {
	const { filename, _opts } = {
		bookType: 'xlsx',
		type: 'binary',
		cellStyles: true,
		compression: true,
		filename: 'Sheet',
		...opts,
	}
	const workbook = XLSX.utils.book_new()

	sheets.forEach(({ headers = [], rows, sheetName }, index) => {
		const worksheet = XLSX.utils.json_to_sheet(rows)
		if (headers.length > 0) {
			XLSX.utils.sheet_add_aoa(worksheet, [headers], {
				origin: 'A1',
			})
		}

		XLSX.utils.book_append_sheet(workbook, worksheet, sheetName ?? `Sheet${index + 1}`)
	})
	XLSX.writeFile(workbook, `${filename}.xlsx`, _opts)
}
