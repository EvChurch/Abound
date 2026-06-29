UPDATE "RockPerson"
SET "firstName" = NULL
WHERE btrim("firstName") = '';

UPDATE "RockPerson"
SET "nickName" = NULL
WHERE btrim("nickName") = '';

UPDATE "RockPerson"
SET "lastName" = NULL
WHERE btrim("lastName") = '';
