<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";

defineOptions({
  name: "IndexPage",
});

const router = useRouter();

onMounted(() => {
  router.push("/dashboard");
});
</script>
