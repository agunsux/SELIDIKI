// explain/GraphExplainer.js
const db = require('../utils/db');
class GraphExplainer {
  static async explain(entityHash) {
    const [nodes, edges] = await Promise.all([
      db.query(`SELECT n.type, COUNT(*) AS cnt FROM graph_nodes n
        JOIN graph_edges e ON (e.source_id = n.id OR e.target_id = n.id)
        WHERE (e.source_id = $1 OR e.target_id = $1) AND n.id != $1 GROUP BY n.type`, [entityHash]),
      db.query('SELECT relationship, COUNT(*) AS cnt FROM graph_edges WHERE source_id = $1 OR target_id = $1 GROUP BY relationship', [entityHash]),
    ]);
    return {
      connected_nodes: nodes.rows.map(n => ({ type: n.type, count: parseInt(n.cnt, 10) })),
      relationships: edges.rows.map(e => ({ type: e.relationship, count: parseInt(e.cnt, 10) })),
      summary: `Entitas terhubung dengan ${nodes.rows.reduce((s, r) => s + parseInt(r.cnt, 10), 0)} node melalui ${edges.rows.reduce((s, r) => s + parseInt(r.cnt, 10), 0)} hubungan`,
    };
  }
}
module.exports = GraphExplainer;