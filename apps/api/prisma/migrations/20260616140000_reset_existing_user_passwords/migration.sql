-- Redefine senha padrão 720425 e obriga troca no próximo login para todos,
-- exceto rubinholima (rl@bostoncitygroup.biz).

UPDATE "User"
SET
  "passwordHash" = '$2b$10$8BYJm7DP1gJWadBp0edqeeDoQHIdnw1LIqk7j0Ccz4ZL7aNzXwPdC',
  "mustChangePassword" = true,
  "updatedAt" = NOW()
WHERE lower(trim("username")) <> 'rubinholima'
  AND lower(trim("email")) <> 'rl@bostoncitygroup.biz';

UPDATE "User"
SET
  "mustChangePassword" = false,
  "updatedAt" = NOW()
WHERE lower(trim("username")) = 'rubinholima'
   OR lower(trim("email")) = 'rl@bostoncitygroup.biz';
