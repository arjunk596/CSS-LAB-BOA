#include <stdio.h>
#include <string.h>

void vulnerable_concat(char *suffix) {
    char buffer[20] = "Hello, ";
    strcat(buffer, suffix); /* VULNERABLE: no bound on remaining space */
    printf("%s\n", buffer);
}

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <string>\n", argv[0]); return 1; }
    vulnerable_concat(argv[1]);
    printf("Returned safely.\n");
    return 0;
}
