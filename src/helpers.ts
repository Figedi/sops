import { chunk, isPlainObject, isArray } from "lodash";

export const uncoverPaths = (tree: any): any[][] => {
    const doUncover = (t: any, path: (string | number)[] = []): any[][] => {
        if (isArray(t)) {
            return t.reduce((acc, v, k) => [...acc, ...doUncover(v, [...path, k])], []);
        }
        if (isPlainObject(t)) {
            return Object.keys(t).reduce((acc, k) => [...acc, ...doUncover(t[k], [...path, k])], [] as any);
        }

        return [path.join("."), t];
    };

    return chunk(doUncover(tree), 2); // since the output is flattened, chunk k-v entrypairs
};
