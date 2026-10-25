// @ts-check

import assert from "node:assert/strict";
import { test } from "node:test";
import { validateBuildShot } from "../scripts/lib/builds.mjs";

test("a build with a shot must have a non-empty alt", () => {
  assert.throws(() => validateBuildShot({ title: "RoleCall", shot: "rolecall" }), /shotAlt/);
  assert.throws(() => validateBuildShot({ title: "RoleCall", shot: "rolecall", shotAlt: "" }), /shotAlt/);
  assert.throws(() => validateBuildShot({ title: "RoleCall", shot: "rolecall", shotAlt: "   " }), /shotAlt/);
});

test("a build without a shot needs no alt", () => {
  assert.doesNotThrow(() => validateBuildShot({ title: "RoleCall" }));
  assert.doesNotThrow(() => validateBuildShot({ title: "RoleCall", shot: "" }));
});

test("a real alt passes", () => {
  const item = { title: "RoleCall", shot: "rolecall", shotAlt: "The RoleCall dashboard" };
  assert.equal(validateBuildShot(item), item);
});
