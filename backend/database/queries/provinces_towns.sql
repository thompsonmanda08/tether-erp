-- Provinces and towns queries
-- Reference (lookup) tables; read-only for application code.

-- name: ListProvinces :many
SELECT * FROM provinces ORDER BY name ASC;

-- name: GetProvinceByID :one
SELECT * FROM provinces WHERE id = $1;

-- name: GetProvinceByCode :one
SELECT * FROM provinces WHERE code = $1;

-- name: ListTowns :many
SELECT * FROM towns ORDER BY name ASC;

-- name: ListTownsByProvince :many
SELECT * FROM towns WHERE province_id = $1 ORDER BY name ASC;

-- name: GetTownByID :one
SELECT * FROM towns WHERE id = $1;
