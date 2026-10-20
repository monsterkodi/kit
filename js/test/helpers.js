var matches, notMatches


matches = function (text, pattern)
{
    pattern.lastIndex = 0
    if (pattern.test(text))
    {
        return compare(pattern,pattern)
    }
    return compare(pattern,text)
}

notMatches = function (text, pattern)
{
    pattern.lastIndex = 0
    if (pattern.test(text))
    {
        return compare('no ' + pattern,text)
    }
    return compare(pattern,pattern)
}
export default {
    matches:matches,
    notMatches:notMatches
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZXMiOlsiLi4vLi4va29kZS90ZXN0L2hlbHBlcnMua29kZSJdLCJtYXBwaW5ncyI6Ijs7O0FBUUE7O0lBS0ksUUFBUSxZQUFZO1FBRWpCLFFBQVEsS0FBSzs7ZUFDVixRQUFRLFFBQVM7O1dBQ3ZCLFFBQVEsUUFBUzs7O0FBRXJCOztJQUVJLFFBQVEsWUFBWTtRQUVqQixRQUFRLEtBQUs7O2VBQ1YsUUFBUSxRQUFRLFFBQVM7O1dBQy9CLFFBQVEsUUFBUzs7O0lBR2pCLFFBQVM7SUFDVCxXQUFZIn0=
//# sourceURL=file:///home/kodi/s/kit/kode/test/helpers.kode
