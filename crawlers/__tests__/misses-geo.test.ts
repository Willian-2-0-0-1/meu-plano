import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateMiss,
  nextMissStatus,
  shouldSkipMissesForLimitedRun,
} from "../misses";
import { originForPlan, resolveCepOrCity, CAMPINAS_LOCATION } from "../../src/lib/geo";

describe("misses / first-last seen", () => {
  it("run limitada NÃO aplica miss", () => {
    assert.equal(shouldSkipMissesForLimitedRun(8), true);
    assert.equal(shouldSkipMissesForLimitedRun(49), true);
    assert.equal(shouldSkipMissesForLimitedRun(50), false);
    assert.equal(shouldSkipMissesForLimitedRun(undefined), false);

    const d = evaluateMiss({
      seenInRun: false,
      limit: 8,
      consecutiveMisses: 5,
      currentStatus: "listed",
    });
    assert.equal(d.apply, false);
    assert.equal(d.reason, "limited_run");
  });

  it("visto na run não incrementa miss", () => {
    const d = evaluateMiss({
      seenInRun: true,
      limit: 100,
      consecutiveMisses: 2,
      currentStatus: "listed",
    });
    assert.equal(d.apply, false);
    assert.equal(d.reason, "seen_in_run");
  });

  it("após threshold → possibly_removed; depois removed", () => {
    const t = 3;
    let status = "listed";
    let misses = 0;
    for (let i = 0; i < 3; i++) {
      const n = nextMissStatus({ consecutiveMisses: misses, currentStatus: status, missThreshold: t });
      misses = n.consecutiveMisses;
      status = n.status;
    }
    assert.equal(misses, 3);
    assert.equal(status, "possibly_removed");

    const removed = nextMissStatus({
      consecutiveMisses: misses,
      currentStatus: status,
      missThreshold: t,
    });
    assert.equal(removed.status, "removed_from_operator_network");
    assert.equal(removed.consecutiveMisses, 4);
  });

  it("1 miss isolado NÃO remove", () => {
    const d = evaluateMiss({
      seenInRun: false,
      limit: 100,
      consecutiveMisses: 0,
      currentStatus: "listed",
      missThreshold: 3,
    });
    assert.equal(d.apply, true);
    assert.equal(d.nextMisses, 1);
    assert.equal(d.nextStatus, "listed");
  });
});

describe("geo / plano Campinas", () => {
  it("resolve Campinas por nome e CEP 130", () => {
    assert.equal(resolveCepOrCity("Campinas").city, "Campinas");
    assert.equal(resolveCepOrCity("13020-431").city, "Campinas");
  });

  it("originForPlan reconhece Unimed Campinas / ANS 0347", () => {
    assert.deepEqual(
      originForPlan({ operator: "Unimed Campinas", name: "X", ansCode: "0347" }),
      CAMPINAS_LOCATION
    );
    assert.equal(originForPlan({ operator: "SulAmérica", name: "Especial 100" }), null);
  });
});
