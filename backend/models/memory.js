const db = require('../database/database');

class Memory {
    // Create a new memory entry
    static async create(memoryData) {
        const {
            title,
            description,
            category,
            photo_path,
            tags,
            location
        } = memoryData;

        const sql = `
            INSERT INTO memories (title, description, category, photo_path, tags, location)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        try {
            const result = await db.run(sql, [
                title,
                description,
                category,
                photo_path,
                JSON.stringify(tags || []),
                location
            ]);
            
            return await this.findById(result.id);
        } catch (error) {
            throw new Error(`Failed to create memory: ${error.message}`);
        }
    }

    // Find memory by ID
    static async findById(id) {
        const sql = 'SELECT * FROM memories WHERE id = ?';
        
        try {
            const memory = await db.get(sql, [id]);
            if (memory && memory.tags) {
                memory.tags = JSON.parse(memory.tags);
            }
            return memory;
        } catch (error) {
            throw new Error(`Failed to find memory: ${error.message}`);
        }
    }

    // Get all memories with optional filters
    static async findAll(filters = {}) {
        let sql = 'SELECT * FROM memories';
        let params = [];
        let conditions = [];

        // Add filters
        if (filters.category) {
            conditions.push('category = ?');
            params.push(filters.category);
        }

        if (filters.search) {
            conditions.push('(title LIKE ? OR description LIKE ?)');
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        if (filters.dateFrom) {
            conditions.push('date_logged >= ?');
            params.push(filters.dateFrom);
        }

        if (filters.dateTo) {
            conditions.push('date_logged <= ?');
            params.push(filters.dateTo);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY date_logged DESC';

        // Add limit if specified
        if (filters.limit) {
            sql += ' LIMIT ?';
            params.push(filters.limit);
        }

        try {
            const memories = await db.all(sql, params);
            return memories.map(memory => {
                if (memory.tags) {
                    memory.tags = JSON.parse(memory.tags);
                }
                return memory;
            });
        } catch (error) {
            throw new Error(`Failed to fetch memories: ${error.message}`);
        }
    }

    // Update memory
    static async update(id, updateData) {
        const fields = [];
        const values = [];

        // Build dynamic update query
        Object.keys(updateData).forEach(key => {
            if (key === 'tags') {
                fields.push(`${key} = ?`);
                values.push(JSON.stringify(updateData[key]));
            } else {
                fields.push(`${key} = ?`);
                values.push(updateData[key]);
            }
        });

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const sql = `UPDATE memories SET ${fields.join(', ')} WHERE id = ?`;

        try {
            await db.run(sql, values);
            return await this.findById(id);
        } catch (error) {
            throw new Error(`Failed to update memory: ${error.message}`);
        }
    }

    // Delete memory
    static async delete(id) {
        const sql = 'DELETE FROM memories WHERE id = ?';
        
        try {
            const result = await db.run(sql, [id]);
            return result.changes > 0;
        } catch (error) {
            throw new Error(`Failed to delete memory: ${error.message}`);
        }
    }

    // Get memory statistics
    static async getStats() {
        try {
            const totalMemories = await db.get('SELECT COUNT(*) as count FROM memories');
            const categoriesCount = await db.all(`
                SELECT category, COUNT(*) as count 
                FROM memories 
                WHERE category IS NOT NULL 
                GROUP BY category
            `);
            const recentMemories = await db.get(`
                SELECT COUNT(*) as count 
                FROM memories 
                WHERE date_logged >= date('now', '-7 days')
            `);

            return {
                total: totalMemories.count,
                byCategory: categoriesCount,
                thisWeek: recentMemories.count
            };
        } catch (error) {
            throw new Error(`Failed to get stats: ${error.message}`);
        }
    }

    // Add extracted fact to memory
    static async addExtractedFact(memoryId, factText, confidenceScore = 0.8) {
        const sql = `
            INSERT INTO extracted_facts (memory_id, fact_text, confidence_score)
            VALUES (?, ?, ?)
        `;

        try {
            const result = await db.run(sql, [memoryId, factText, confidenceScore]);
            return result.id;
        } catch (error) {
            throw new Error(`Failed to add extracted fact: ${error.message}`);
        }
    }

    // Get extracted facts for a memory
    static async getExtractedFacts(memoryId) {
        const sql = 'SELECT * FROM extracted_facts WHERE memory_id = ? ORDER BY created_at DESC';
        
        try {
            return await db.all(sql, [memoryId]);
        } catch (error) {
            throw new Error(`Failed to get extracted facts: ${error.message}`);
        }
    }
}

module.exports = Memory;