import { db } from '@/lib/db'

/**
 * Supabase-compatible query builder backed by Railway PostgreSQL.
 */

// Maps "alias:table(*)" join syntax to SQL LEFT JOIN info
function parseJoins(cols: string): { cleanCols: string; joins: Array<{ alias: string; table: string }> } {
  const joins: Array<{ alias: string; table: string }> = []
  const joinPattern = /(\w+):(\w+)\([^)]*\)/g
  let match
  while ((match = joinPattern.exec(cols)) !== null) {
    joins.push({ alias: match[1], table: match[2] })
  }
  const cleanCols = cols.replace(/,?\s*\w+:\w+\([^)]*\)/g, '').replace(/,\s*$/, '').trim() || '*'
  return { cleanCols, joins }
}

class SelectBuilder {
  private _table: string
  private _cols: string
  private _joins: Array<{ alias: string; table: string }>
  private _conditions: string[] = []
  private _values: any[] = []
  private _orderBy: string | null = null
  private _limitVal: number | null = null
  private _offsetVal: number | null = null
  private _isSingle: boolean = false
  private _hasCount: boolean = false

  constructor(table: string, colsRaw: string) {
    this._table = table
    const { cleanCols, joins } = parseJoins(colsRaw)
    this._cols = cleanCols
    this._joins = joins
  }

  eq(col: string, val: any) { this._addCond(`${this._table}.${col.includes('.') ? col.split('.')[1] : col} = $${this._nextIdx()}`, val); return this }
  neq(col: string, val: any) { this._addCond(`${this._table}.${col} != $${this._nextIdx()}`, val); return this }
  in(col: string, vals: any[]) {
    const ph = vals.map(() => `$${this._nextIdx()}`).join(', ')
    vals.forEach(v => this._values.push(v))
    this._conditions.push(`${this._table}.${col} IN (${ph})`)
    return this
  }
  gte(col: string, val: any) { this._addCond(`${this._table}.${col} >= $${this._nextIdx()}`, val); return this }
  lte(col: string, val: any) { this._addCond(`${this._table}.${col} <= $${this._nextIdx()}`, val); return this }
  ilike(col: string, val: any) { this._addCond(`${this._table}.${col} ILIKE $${this._nextIdx()}`, val); return this }
  is(col: string, val: any) {
    if (val === null) this._conditions.push(`${this._table}.${col} IS NULL`)
    else { this._addCond(`${this._table}.${col} IS $${this._nextIdx()}`, val) }
    return this
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this._orderBy = `${this._table}.${col} ${opts?.ascending === false ? 'DESC' : 'ASC'}`
    return this
  }
  limit(n: number) { this._limitVal = n; return this }
  range(from: number, to: number) { this._offsetVal = from; this._limitVal = to - from + 1; return this }
  single() { this._isSingle = true; this._limitVal = 1; return this._run() }
  maybeSingle() { this._isSingle = true; this._limitVal = 1; return this._run() }
  then(res: (v: any) => any, rej?: (e: any) => any) { return this._run().then(res, rej) }

  private _nextIdx() { return this._values.length + 1 }
  private _addCond(cond: string, val: any) { this._values.push(val); this._conditions.push(cond) }

  private async _run(): Promise<{ data: any; error: any; count?: number }> {
    try {
      // Build JOIN clauses
      const joinClauses = this._joins.map(j =>
        `LEFT JOIN ${j.table} AS ${j.alias} ON ${j.alias}.id = ${this._table}.${j.alias.replace(/_profiles|_categories/, '')}_id`
      ).join(' ')

      // Build SELECT cols with join columns as JSON
      let selectCols = this._cols === '*' ? `${this._table}.*` : this._cols
      const joinSelects = this._joins.map(j =>
        `(SELECT row_to_json(r) FROM (SELECT ${j.alias}.* FROM ${j.table} ${j.alias} WHERE ${j.alias}.id = ${this._table}.${j.alias.replace(/_profiles|_categories/, '')}_id LIMIT 1) r) AS ${j.alias}`
      )
      if (joinSelects.length) selectCols += ', ' + joinSelects.join(', ')

      const where = this._conditions.length ? `WHERE ${this._conditions.join(' AND ')}` : ''
      const order = this._orderBy ? `ORDER BY ${this._orderBy}` : ''
      const limit = this._limitVal ? `LIMIT ${this._limitVal}` : ''
      const offset = this._offsetVal ? `OFFSET ${this._offsetVal}` : ''

      // Count query
      let count: number | undefined
      if (this._hasCount) {
        const countSql = `SELECT COUNT(*) FROM ${this._table} ${where}`
        const cr = await db.query(countSql, this._values)
        count = parseInt(cr.rows[0].count)
      }

      const sql = `SELECT ${selectCols} FROM ${this._table} ${where} ${order} ${limit} ${offset}`.trim()
      const result = await db.query(sql, this._values)

      if (this._isSingle) {
        return { data: result.rows[0] ?? null, error: null, count }
      }
      return { data: result.rows, error: null, count }
    } catch (error: any) {
      return { data: null, error }
    }
  }
}

class QueryBuilder {
  private _table: string
  constructor(table: string) { this._table = table }

  select(cols: string = '*', _opts?: any): SelectBuilder {
    return new SelectBuilder(this._table, cols)
  }

  insert(data: Record<string, any> | Record<string, any>[]) {
    return new MutationBuilder(this._table, 'insert', data)
  }

  upsert(data: Record<string, any> | Record<string, any>[], opts?: { onConflict?: string }) {
    return new MutationBuilder(this._table, 'upsert', data, opts?.onConflict)
  }

  update(data: Record<string, any>) {
    return new MutationBuilder(this._table, 'update', data)
  }

  delete() {
    return new MutationBuilder(this._table, 'delete', {})
  }
}

class MutationBuilder {
  private _table: string
  private _type: string
  private _data: any
  private _conflict?: string
  private _conditions: string[] = []
  private _values: any[] = []

  constructor(table: string, type: string, data: any, conflict?: string) {
    this._table = table; this._type = type; this._data = data; this._conflict = conflict
  }

  eq(col: string, val: any) { this._values.push(val); this._conditions.push(`${col} = $${this._values.length}`); return this }
  select(_cols?: string) { return this }

  single() { return this._run(true) }
  then(res: (v: any) => any, rej?: (e: any) => any) { return this._run(false).then(res, rej) }

  private async _run(single = false): Promise<{ data: any; error: any }> {
    try {
      if (this._type === 'insert' || this._type === 'upsert') {
        const rows = Array.isArray(this._data) ? this._data : [this._data]
        const results = []
        for (const row of rows) {
          const filteredRow: Record<string, any> = {}
          for (const [k, v] of Object.entries(row)) {
            if (v !== undefined) filteredRow[k] = v
          }
          const cols = Object.keys(filteredRow)
          const vals = Object.values(filteredRow)
          const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ')
          let sql = `INSERT INTO ${this._table} (${cols.join(', ')}) VALUES (${placeholders})`
          if (this._type === 'upsert' && this._conflict) {
            const setCols = cols.filter(c => c !== this._conflict).map(c => `${c} = EXCLUDED.${c}`).join(', ')
            sql += ` ON CONFLICT (${this._conflict}) DO UPDATE SET ${setCols}`
          }
          sql += ' RETURNING *'
          const r = await db.query(sql, vals)
          results.push(...r.rows)
        }
        const out = single ? (results[0] ?? null) : results
        return { data: out, error: null }
      }

      if (this._type === 'update') {
        const cols = Object.keys(this._data)
        const vals = Object.values(this._data)
        const setCols = cols.map((c, i) => `${c} = $${i + 1}`).join(', ')
        const condOffset = vals.length
        const where = this._conditions.map((c, i) =>
          c.replace(/\$(\d+)/, `$${condOffset + i + 1}`)
        ).join(' AND ')
        const sql = `UPDATE ${this._table} SET ${setCols}${where ? ` WHERE ${where}` : ''} RETURNING *`
        const r = await db.query(sql, [...vals, ...this._values])
        return { data: single ? (r.rows[0] ?? null) : r.rows, error: null }
      }

      if (this._type === 'delete') {
        const where = this._conditions.length ? `WHERE ${this._conditions.join(' AND ')}` : ''
        const sql = `DELETE FROM ${this._table} ${where} RETURNING *`
        const r = await db.query(sql, this._values)
        return { data: r.rows, error: null, count: r.rowCount ?? 0 }
      }

      return { data: null, error: new Error('Unknown mutation type') }
    } catch (error: any) {
      return { data: null, error }
    }
  }
}

class SupabaseCompatClient {
  from(table: string) { return new QueryBuilder(table) }

  async rpc(fn: string, params: Record<string, any> = {}) {
    try {
      const args = Object.values(params)
      const placeholders = args.map((_, i) => `$${i + 1}`).join(', ')
      const sql = `SELECT ${fn}(${placeholders}) as result`
      const r = await db.query(sql, args)
      return { data: r.rows[0]?.result ?? null, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }
}

export function getSupabaseAdmin(): SupabaseCompatClient {
  return new SupabaseCompatClient()
}
