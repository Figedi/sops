import { readFile, stat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { chunk, isArray, isPlainObject } from 'lodash';
import yaml from 'yaml';
import { ISopsEncryptedJSON } from './types';

export const uncoverPaths = (tree: any): any[][] => {
    const doUncover = (t: any, walkedPaths: (string | number)[] = []): any[][] => {
        if (isArray(t)) {
            return t.reduce((acc, v, k) => [...acc, ...doUncover(v, [...walkedPaths, k])], []);
        }
        if (isPlainObject(t)) {
            return Object.keys(t).reduce((acc, k) => [...acc, ...doUncover(t[k], [...walkedPaths, k])], [] as any);
        }

        return [walkedPaths.join('.'), t];
    };

    return chunk(doUncover(tree), 2); // since the output is flattened, chunk k-v entrypairs
};

export const resolvePathOrObj = async (objOrPath: string | ISopsEncryptedJSON): Promise<{ content: ISopsEncryptedJSON; fileHint: 'json' | 'yaml' }> => {
    let obj = objOrPath as ISopsEncryptedJSON;
    let fileHint: 'json' | 'yaml' = 'json';
    if (typeof objOrPath === 'string') {
        // it might be a path pointing to an encrypted sops file
        if (isAbsolute(objOrPath) || objOrPath.startsWith('./') || objOrPath.startsWith('../')) {
            if (!['.json', '.yaml', '.yaml'].some(ending => objOrPath.endsWith(ending))) {
                throw new Error(`Please provide a valid .json/.yaml/.yml`);
            }

            if (!(await fileExists(objOrPath))) {
                throw new Error(`Provided path does not exist, please point to an existing file`);
            }

            const fileContent = await readFile(objOrPath, { encoding: 'utf-8' });
            const parseResult = yamlJsonParse<ISopsEncryptedJSON>(fileContent);
            fileHint = parseResult.fileHint;
            obj = parseResult.content;
        } else {
            // it might be just a string which is not yet parsed
            const parseResult = yamlJsonParse<ISopsEncryptedJSON>(objOrPath);
            fileHint = parseResult.fileHint;
            obj = parseResult.content;
        }
    }

    // otherwise take the value directly
    return { content: obj, fileHint };
};

const fileExists = (p: string) =>
    stat(p)
        .then(() => true)
        .catch(() => false);

const yamlJsonParse = <TResult>(content: string): { content: TResult; fileHint: 'json' | 'yaml' } => {
    try {
        const parsedContent = JSON.parse(content) as TResult;
        return { content: parsedContent, fileHint: 'json' };
    } catch (e) {
        const parsedContent = yaml.parse(content) as TResult;

        return { content: parsedContent, fileHint: 'yaml' };
    }
};
