"""
Unit tests for the Equilibrium scoring engine.

Run all tests:
    cd backend/
    python -m unittest test_engine -v

Zero external dependencies — stdlib unittest only.
"""

import unittest

from engine import (
    compute_capacity,
    _calc_mental,
    _calc_time,
    _calc_errands,
    _calc_sleep_multiplier,
    _calc_social_relief,
    _classify,
    _validate_input,
)


# ═══════════════════════════════════════════════════════════════════════════
# Group A — Individual Sub-Score Tests
# ═══════════════════════════════════════════════════════════════════════════


class TestMentalLoad(unittest.TestCase):
    """Mental load: 10 pts / deadline, capped at 40."""

    def test_zero_deadlines(self):
        self.assertEqual(_calc_mental(0), 0.0)

    def test_normal_deadlines(self):
        self.assertEqual(_calc_mental(3), 30.0)

    def test_capped_at_40(self):
        self.assertEqual(_calc_mental(7), 40.0)
        self.assertEqual(_calc_mental(100), 40.0)


class TestTimeLoad(unittest.TestCase):
    """Time load: (hours / 40) * 30, capped at 30."""

    def test_zero_hours(self):
        self.assertEqual(_calc_time(0), 0.0)

    def test_fractional_hours(self):
        # 34.5 / 40 * 30 = 25.875
        self.assertAlmostEqual(_calc_time(34.5), 25.875, places=3)

    def test_capped_at_30(self):
        self.assertEqual(_calc_time(40), 30.0)
        self.assertEqual(_calc_time(80), 30.0)


class TestErrandsLoad(unittest.TestCase):
    """Errands load: 2 pts / task, capped at 15."""

    def test_zero_errands(self):
        self.assertEqual(_calc_errands(0), 0.0)

    def test_normal_errands(self):
        self.assertEqual(_calc_errands(4), 8.0)

    def test_capped_at_15(self):
        self.assertEqual(_calc_errands(8), 15.0)  # 8*2=16 → capped 15
        self.assertEqual(_calc_errands(100), 15.0)


class TestSleepMultiplier(unittest.TestCase):
    """Sleep bracket tests — boundary values are critical."""

    def test_severe_deficit(self):
        self.assertEqual(_calc_sleep_multiplier(3.0), 1.35)
        self.assertEqual(_calc_sleep_multiplier(0.0), 1.35)

    def test_boundary_5_5_is_severe(self):
        """Exactly 5.5 → 1.35x (<=5.5 interpretation to match contract)."""
        self.assertEqual(_calc_sleep_multiplier(5.5), 1.35)

    def test_mild_deficit(self):
        self.assertEqual(_calc_sleep_multiplier(5.6), 1.05)
        self.assertEqual(_calc_sleep_multiplier(6.0), 1.05)
        self.assertEqual(_calc_sleep_multiplier(7.0), 1.05)
        self.assertEqual(_calc_sleep_multiplier(7.4), 1.05)

    def test_neutral(self):
        self.assertEqual(_calc_sleep_multiplier(7.5), 1.0)
        self.assertEqual(_calc_sleep_multiplier(7.9), 1.0)

    def test_well_rested(self):
        self.assertEqual(_calc_sleep_multiplier(8.0), 0.85)
        self.assertEqual(_calc_sleep_multiplier(10.0), 0.85)


class TestSocialRelief(unittest.TestCase):
    """Social relief / isolation penalty."""

    def test_relief_at_threshold(self):
        self.assertEqual(_calc_social_relief(3.0), -10.0)

    def test_relief_above_threshold(self):
        self.assertEqual(_calc_social_relief(5.0), -10.0)

    def test_isolation_exact_zero(self):
        self.assertEqual(_calc_social_relief(0.0), 8.0)

    def test_default_middle(self):
        self.assertEqual(_calc_social_relief(1.5), 0.0)
        self.assertEqual(_calc_social_relief(2.9), 0.0)
        self.assertEqual(_calc_social_relief(0.1), 0.0)


class TestClassifier(unittest.TestCase):
    """Threshold classifier → (status_level, theme_color)."""

    def test_critical_overload(self):
        self.assertEqual(_classify(80),  ("CRITICAL_OVERLOAD", "#EF4444"))
        self.assertEqual(_classify(100), ("CRITICAL_OVERLOAD", "#EF4444"))
        self.assertEqual(_classify(95),  ("CRITICAL_OVERLOAD", "#EF4444"))

    def test_heavy_strain(self):
        self.assertEqual(_classify(60), ("HEAVY_STRAIN", "#F59E0B"))
        self.assertEqual(_classify(79), ("HEAVY_STRAIN", "#F59E0B"))
        self.assertEqual(_classify(70), ("HEAVY_STRAIN", "#F59E0B"))

    def test_balanced(self):
        self.assertEqual(_classify(59), ("BALANCED", "#10B981"))
        self.assertEqual(_classify(0),  ("BALANCED", "#10B981"))
        self.assertEqual(_classify(30), ("BALANCED", "#10B981"))


# ═══════════════════════════════════════════════════════════════════════════
# Group B — End-to-End Contract Compliance
# ═══════════════════════════════════════════════════════════════════════════


class TestContractCompliance(unittest.TestCase):
    """Verify output matches the agreed data contracts."""

    CONTRACT_INPUT = {
        "student_id": "student_01",
        "deadlines_next_48h": 3,
        "scheduled_work_study_hours": 34.5,
        "pending_errands_count": 4,
        "avg_sleep_hours": 5.5,
        "social_hours_last_72h": 1.5,
    }

    def test_contract_example_total(self):
        """Contract input → total_capacity_percent == 86."""
        result = compute_capacity(self.CONTRACT_INPUT)
        self.assertEqual(result["total_capacity_percent"], 86)

    def test_contract_example_status(self):
        """Contract input → CRITICAL_OVERLOAD with red color."""
        result = compute_capacity(self.CONTRACT_INPUT)
        self.assertEqual(result["status_level"], "CRITICAL_OVERLOAD")
        self.assertEqual(result["theme_color"], "#EF4444")

    def test_contract_example_breakdown(self):
        """Verify each breakdown sub-score for the contract input."""
        result = compute_capacity(self.CONTRACT_INPUT)
        bd = result["breakdown"]
        self.assertEqual(bd["mental_points"], 30.0)
        self.assertAlmostEqual(bd["time_points"], 25.9, places=1)
        self.assertEqual(bd["errands_points"], 8.0)
        self.assertEqual(bd["sleep_multiplier"], 1.35)
        # social_hours=1.5 → else branch → 0.0
        self.assertEqual(bd["social_relief_points"], 0.0)

    def test_contract_example_recommendation(self):
        """Sleep deficit triggers the priority-1 recommendation."""
        result = compute_capacity(self.CONTRACT_INPUT)
        rec = result["primary_recommendation"]
        self.assertIn("1.35x", rec)
        self.assertIn("sleep", rec.lower())

    def test_output_schema_top_level_keys(self):
        """Output must have exactly the 5 contract-required keys."""
        result = compute_capacity(self.CONTRACT_INPUT)
        expected = {
            "total_capacity_percent",
            "status_level",
            "theme_color",
            "breakdown",
            "primary_recommendation",
        }
        self.assertEqual(set(result.keys()), expected)

    def test_output_schema_breakdown_keys(self):
        """Breakdown must have exactly the 5 contract-required sub-keys."""
        result = compute_capacity(self.CONTRACT_INPUT)
        expected = {
            "mental_points",
            "time_points",
            "errands_points",
            "sleep_multiplier",
            "social_relief_points",
        }
        self.assertEqual(set(result["breakdown"].keys()), expected)

    def test_balanced_scenario(self):
        """Low-stress student → BALANCED, green, < 60%."""
        data = {
            "student_id": "chill_student",
            "deadlines_next_48h": 0,
            "scheduled_work_study_hours": 5,
            "pending_errands_count": 0,
            "avg_sleep_hours": 9.0,
            "social_hours_last_72h": 4.0,
        }
        result = compute_capacity(data)
        self.assertEqual(result["status_level"], "BALANCED")
        self.assertEqual(result["theme_color"], "#10B981")
        self.assertLess(result["total_capacity_percent"], 60)

    def test_heavy_strain_scenario(self):
        """Moderate-stress student → HEAVY_STRAIN, amber, 60-79%."""
        data = {
            "student_id": "busy_student",
            "deadlines_next_48h": 4,
            "scheduled_work_study_hours": 20,
            "pending_errands_count": 3,
            "avg_sleep_hours": 6.0,
            "social_hours_last_72h": 1.0,
        }
        # mental=40, time=15, errands=6, sleep=1.05, social=0
        # base = (40+15+6)*1.05 = 64.05 → round=64 → HEAVY_STRAIN
        result = compute_capacity(data)
        self.assertEqual(result["status_level"], "HEAVY_STRAIN")
        self.assertEqual(result["theme_color"], "#F59E0B")
        self.assertGreaterEqual(result["total_capacity_percent"], 60)
        self.assertLessEqual(result["total_capacity_percent"], 79)


# ═══════════════════════════════════════════════════════════════════════════
# Group C — Edge Cases & Defensive Tests
# ═══════════════════════════════════════════════════════════════════════════


class TestEdgeCases(unittest.TestCase):
    """Defensive behaviour: missing keys, bad types, negatives, extremes."""

    def _base_input(self):
        """Valid baseline input for mutation testing."""
        return {
            "student_id": "test_student",
            "deadlines_next_48h": 1,
            "scheduled_work_study_hours": 10,
            "pending_errands_count": 1,
            "avg_sleep_hours": 7.0,
            "social_hours_last_72h": 1.0,
        }

    # ── Missing / malformed keys ──────────────────────────────────────

    def test_missing_key_raises(self):
        data = self._base_input()
        del data["avg_sleep_hours"]
        with self.assertRaises(ValueError) as ctx:
            compute_capacity(data)
        self.assertIn("avg_sleep_hours", str(ctx.exception))

    def test_empty_student_id_raises(self):
        data = self._base_input()
        data["student_id"] = "   "
        with self.assertRaises(ValueError):
            compute_capacity(data)

    def test_non_dict_input_raises(self):
        with self.assertRaises(ValueError):
            compute_capacity("not a dict")

    def test_string_in_numeric_field_raises(self):
        data = self._base_input()
        data["deadlines_next_48h"] = "three"
        with self.assertRaises(ValueError) as ctx:
            compute_capacity(data)
        self.assertIn("numeric", str(ctx.exception))

    # ── Negative values (clamped to 0) ────────────────────────────────

    def test_negative_deadlines_clamped(self):
        data = self._base_input()
        data["deadlines_next_48h"] = -5
        result = compute_capacity(data)
        # Clamped to 0 → mental_points == 0
        self.assertEqual(result["breakdown"]["mental_points"], 0.0)

    # ── All zeros ─────────────────────────────────────────────────────

    def test_all_zeros(self):
        """Every numeric field zero → valid output, no crash."""
        data = {
            "student_id": "zero_student",
            "deadlines_next_48h": 0,
            "scheduled_work_study_hours": 0,
            "pending_errands_count": 0,
            "avg_sleep_hours": 0,
            "social_hours_last_72h": 0,
        }
        result = compute_capacity(data)
        # mental=0, time=0, errands=0 → sub_total=0
        # sleep=0 → <=5.5 → 1.35x → base=0*1.35=0
        # social=0 → <=0 → +8 isolation
        # final = clamp(round(0+8), 0, 100) = 8 → BALANCED
        self.assertEqual(result["total_capacity_percent"], 8)
        self.assertEqual(result["status_level"], "BALANCED")

    # ── Max overload (clamped to 100) ─────────────────────────────────

    def test_max_overload_capped_at_100(self):
        """Extreme values → clamped to 100, not above."""
        data = {
            "student_id": "overloaded_student",
            "deadlines_next_48h": 10,
            "scheduled_work_study_hours": 60,
            "pending_errands_count": 20,
            "avg_sleep_hours": 2.0,
            "social_hours_last_72h": 0,
        }
        result = compute_capacity(data)
        self.assertEqual(result["total_capacity_percent"], 100)
        self.assertEqual(result["status_level"], "CRITICAL_OVERLOAD")

    # ── Extra keys are ignored (forward-compat) ──────────────────────

    def test_extra_keys_ignored(self):
        data = self._base_input()
        data["mood_score"] = 7
        data["caffeine_mg"] = 400
        result = compute_capacity(data)
        self.assertIn("total_capacity_percent", result)


# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    unittest.main()
