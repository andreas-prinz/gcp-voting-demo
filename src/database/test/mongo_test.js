const assert = require('assert');
const Database = require('../lib/Mongo');
const shortid = require('shortid');

const TEST_TIMEOUT = 10000;

suite('database tests', function() {
  this.timeout(TEST_TIMEOUT);

  suite('basic mongo wrapper tests', () => {

    let db;

    // randomly generated database name used for testing, dropped when finished
    let dbName = `testdb_${shortid.generate()}`;

    setup(async () => {
      // Create a standard config and override db
      // (a standard config overrides defaults with values from the environment and finally any explicit values)
      let config = Database.createStdConfig({ db: dbName });

      db = new Database(config);
      assert.equal(db.connectionURL, config.uri || `mongodb://${config.host}:${config.port}/${config.db}`);
      await db.connect();
      assert.ok(db.instance);
      assert.equal(db.instance.databaseName, config.db);
      assert.equal(db.isConnected, true);
    });

    teardown(async () => {
      await db.instance.dropDatabase();
      await db.close();
      assert.equal(db.isConnected, false);
      assert.equal(db.client, null);
      assert.equal(db.instance, null);
    });

    test('add vote to database', async () => {
      let v = {
        vote: 'a'
      };

      let doc = await db.updateVote(v);
      assert.ok(doc);
      assert.equal(doc.vote, v.vote);
      assert.ok(doc.voter_id);
    });

    test('missing vote property should throw', async () => {
      // invalid vote (must have vote property)
      let v = {};

      try {
        await db.updateVote(v);
      } catch (err) {
        // expected error starts with 'Invalid vote'
        if (!err.message.startsWith('Invalid vote')) {
            // otherwise rethrow unexpected error
          throw err;
        }
      }
    });

    test('bad vote value should throw', async () => {
      // invalid value for vote (must be 'a' or 'b')
      let v = {
        vote: 'c'
      };

      try {
        await db.updateVote(v);
      } catch (err) {
        // expected error starts with 'Invalid vote'
        if (!err.message.startsWith('Invalid vote')) {
          // otherwise rethrow unexpected error
          throw err;
        }
      }
    });

    test('tally votes', async () => {
      let count_a = 4;
      for (let i = 0; i < count_a; i++) {
        await db.updateVote({ vote: 'a' });
      }

      let count_b = 5;
      for (let i = 0; i < count_b; i++) {
        await db.updateVote({ vote: 'b' });
      }

      let tally = await db.tallyVotes();
      assert.ok(tally);
      assert.equal(tally.a, count_a, `'a' => expected: ${count_a}, actual: ${tally.a}`);
      assert.equal(tally.b, count_b, `'b' => expected: ${count_b}, actual: ${tally.b}`);
    });

  });
});
