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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZXMiOlsiLi4vLi4va29kZS90ZXN0L2hlbHBlcnMua29kZSJdLCJtYXBwaW5ncyI6Ijs7O0FBUUEsb0JBQVcsTUFBTTs7SUFLYixRQUFRLFlBQVk7UUFFakIsUUFBUSxLQUFLOztlQUNWLFFBQVEsUUFBUzs7V0FDdkIsUUFBUSxRQUFTOzs7QUFFckIsdUJBQWMsTUFBTTs7SUFFaEIsUUFBUSxZQUFZO1FBRWpCLFFBQVEsS0FBSzs7ZUFDVixRQUFRLFFBQVEsUUFBUzs7V0FDL0IsUUFBUSxRQUFTOzs7SUFHakIsUUFBUztJQUNULFdBQVkifQ==
//# sourceURL=../../kode/test/helpers.kode
