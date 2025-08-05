<script>
        import { addTeacher, addStudent } from '$lib/api';
        let teacherName = '';
        let teacherPin = '';
        let teacherMsg = '';
        async function handleAddTeacher() {
                try {
                        await addTeacher(fetch, { name: teacherName, pin: teacherPin });
                        teacherMsg = 'Teacher added';
                } catch {
                        teacherMsg = 'Failed to add teacher';
                }
        }

        let studentName = '';
        let studentPin = '';
        let studentMsg = '';
        async function handleAddStudent() {
                try {
                        await addStudent(fetch, { name: studentName, pin: studentPin });
                        studentMsg = 'Student added';
                } catch {
                        studentMsg = 'Failed to add student';
                }
        }
</script>

<main>
        <h1>Admin</h1>
        <section>
                <h2>Add Teacher</h2>
                <input type="text" placeholder="Name" bind:value={teacherName} />
                <input type="text" placeholder="PIN" bind:value={teacherPin} />
                <button on:click={handleAddTeacher}>Add Teacher</button>
                {#if teacherMsg}<p>{teacherMsg}</p>{/if}
        </section>
        <section>
                <h2>Add Student</h2>
                <input type="text" placeholder="Name" bind:value={studentName} />
                <input type="text" placeholder="PIN" bind:value={studentPin} />
                <button on:click={handleAddStudent}>Add Student</button>
                {#if studentMsg}<p>{studentMsg}</p>{/if}
        </section>
</main>

<style>
        main {
                max-width: 60rem;
                margin: 0 auto;
                padding: 2rem;
                font-family: system-ui, sans-serif;
        }
        section {
                margin-top: 1.5rem;
        }
        button {
                background-color: #0d3b66;
                color: #fff;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 0.25rem;
                cursor: pointer;
        }
        button:hover {
                background-color: #092745;
        }
</style>
